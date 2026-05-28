import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';

const args = parseArgs({
  args: process.argv.slice(2),
  options: {
    name: { type: 'string', short: 'n' },
    queue: { type: 'string', short: 'q' },
    generateTest: { type: 'boolean', short: 't' },
  },
  allowPositionals: true,
});

const jobName = args.values.name || args.positionals[0];
const queueName = args.values.queue || 'default-queue';

if (!jobName) {
  console.error("❌ Please provide a job name. Example: bun run make:job ProcessPayment");
  process.exit(1);
}

const kebabCase = jobName
  .replace(/([a-z])([A-Z])/g, "$1-$2")
  .replace(/[\s_]+/g, '-')
  .toLowerCase();

const camelCase = kebabCase.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

const pascalCase = jobName
  .replace(/(^\w|-\w)/g, (clearAndUpper) => clearAndUpper.replace(/-/, "").toUpperCase())
  .replace(/Processor$/, "") + "Processor";

const jobNameConstant = kebabCase.replace(/-/g, '_').toUpperCase();

const filesCreated: string[] = [];

// 1. Create processor file
const processorDir = path.join(process.cwd(), 'src', 'processor');
fs.mkdirSync(processorDir, { recursive: true });

const processorFilePath = path.join(processorDir, `${kebabCase}.ts`);
if (fs.existsSync(processorFilePath)) {
  console.error(`❌ Processor file already exists at: ${processorFilePath}`);
} else {
  const processorTemplate = `import { BaseProcessor } from "@boilerplate/processor/base";
import { z } from "zod";
import logger from "../utils/logger.ts";

export const ${pascalCase}Schema = z.object({
  id: z.string(),
});

export type ${pascalCase}Data = z.infer<typeof ${pascalCase}Schema>;

export class ${pascalCase} extends BaseProcessor<${pascalCase}Data> {
  schema = ${pascalCase}Schema;

  async handle(job: any): Promise<void> {
    const data = job.data as ${pascalCase}Data;

    logger.info({ jobId: job.id, data }, \`[${pascalCase}] Processing job\`);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    logger.info({ jobId: job.id }, \`[${pascalCase}] Successfully processed job\`);
  }
}
`;

  fs.writeFileSync(processorFilePath, processorTemplate);
  filesCreated.push(processorFilePath);
  console.log(`✅ Created processor: ${processorFilePath}`);
}

// 2. Register in shared/jobs.ts
const jobsFilePath = path.join(process.cwd(), 'src', 'shared', 'jobs.ts');
if (fs.existsSync(jobsFilePath)) {
  let jobsContent = fs.readFileSync(jobsFilePath, 'utf-8');

  const jobEntry = `\n  ${jobNameConstant}: {\n    name: "${kebabCase}",\n    schema: z.object({ id: z.string() }),\n  },`;

  if (!jobsContent.includes(`  ${jobNameConstant}:`)) {
    // Find where to insert (before the closing bracket of JOBS object)
    const insertIndex = jobsContent.lastIndexOf('} as const;');
    if (insertIndex !== -1) {
      jobsContent = jobsContent.slice(0, insertIndex) + jobEntry + '\n' + jobsContent.slice(insertIndex);
      fs.writeFileSync(jobsFilePath, jobsContent);
      filesCreated.push(`Updated: ${jobsFilePath}`);
      console.log(`✅ Updated shared/jobs.ts with ${jobNameConstant} entry`);
    }
  } else {
    console.log(`⏭️  Job entry ${jobNameConstant} already exists in shared/jobs.ts`);
  }
}

// 3. Register in registry/index.ts
const registryFilePath = path.join(process.cwd(), 'src', 'registry', 'index.ts');
if (fs.existsSync(registryFilePath)) {
  let registryContent = fs.readFileSync(registryFilePath, 'utf-8');

  const importLine = `import { ${pascalCase} } from "../processor/${kebabCase}";\n`;

  const registryEntry = `  [JOBS.${jobNameConstant}.name]: new ${pascalCase}(),\n`;

  // Add import if not exists
  if (!registryContent.includes(`import { ${pascalCase} }`)) {
    // Find the last import line and insert after it
    const importLines = registryContent.match(/^import .+$/gm);
    if (importLines && importLines.length > 0) {
      const lastImport = importLines[importLines.length - 1];
      const importIndex = registryContent.lastIndexOf(lastImport) + lastImport.length;
      registryContent = registryContent.slice(0, importIndex) + '\n' + importLine + registryContent.slice(importIndex);
    } else {
      registryContent = importLine + '\n' + registryContent;
    }
  }

  // Add registry entry if not exists
  if (!registryContent.includes(`[JOBS.${jobNameConstant}.name]`)) {
    const insertIndex = registryContent.lastIndexOf('};');
    if (insertIndex !== -1) {
      registryContent = registryContent.slice(0, insertIndex) + registryEntry + registryContent.slice(insertIndex);
    }
  }

  fs.writeFileSync(registryFilePath, registryContent);
  filesCreated.push(`Updated: ${registryFilePath}`);
  console.log(`✅ Updated registry/index.ts with ${pascalCase}`);
}

// 4. Generate test file if requested
if (args.values.generateTest) {
  const testsDir = path.join(process.cwd(), 'tests');
  fs.mkdirSync(testsDir, { recursive: true });

  const testFilePath = path.join(testsDir, `${kebabCase}.test.ts`);
  if (fs.existsSync(testFilePath)) {
    console.log(`⏭️  Test file already exists: ${testFilePath}`);
  } else {
    const testTemplate = `import { describe, it, expect } from "bun:test";
import { ${pascalCase}, ${pascalCase}Schema } from "../src/processor/${kebabCase}";

describe("${pascalCase}", () => {
  it("should validate schema with correct data", () => {
    const result = ${pascalCase}Schema.safeParse({ id: "test-id" });
    expect(result.success).toBe(true);
  });

  it("should reject invalid data", () => {
    const result = ${pascalCase}Schema.safeParse({});
    expect(result.success).toBe(false);
  });
});
`;

    fs.writeFileSync(testFilePath, testTemplate);
    filesCreated.push(testFilePath);
    console.log(`✅ Created test: ${testFilePath}`);
  }
}

// Summary
console.log('\n📋 Summary of created/updated files:');
filesCreated.forEach(f => console.log(`   - ${f}`));

console.log(`
👉 Next steps:
1. Define the job schema fields in src/processor/${kebabCase}.ts
2. Add a disposer method in src/queue/disposer.ts
3. Implement your business logic in the handle() method
4. Run tests: bun test tests/${kebabCase}.test.ts
`);
