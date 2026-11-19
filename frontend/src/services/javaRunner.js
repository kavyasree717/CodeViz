
export async function executeJava(code) {
  const response = await fetch('http://localhost:5000/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Java execution failed.');
  }

  return result;
}
