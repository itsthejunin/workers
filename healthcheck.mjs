try {
  const response = await fetch('http://localhost:3000/health/ready');
  if (response.ok) {
    process.exit(0);
  } else {
    process.exit(1);
  }
} catch (err) {
  console.error('Healthcheck error:', err);
  process.exit(1);
}