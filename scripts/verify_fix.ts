import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:3001/api/delivery-summary';

async function test() {
  console.log(`Testing API at ${API_URL}...`);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Entrega de Teste Verificação',
        description:
          'Esta é uma entrega criada automaticamente para verificar a correção do endpoint de resumo por IA.',
        transformations_achievements: 'O sistema deve retornar um resumo conciso desta entrega.',
      }),
    });

    console.log(`Response Status: ${response.status}`);
    const data = await response.json();
    console.log('Response Body:', JSON.stringify(data, null, 2));

    if (response.ok && data.summary) {
      console.log('✅ Verification SUCCESS: Summary generated.');
    } else {
      console.error('❌ Verification FAILED: No summary or error status.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Verification FAILED: Network error or server not reachable.');
    console.error(error);
    process.exit(1);
  }
}

test();
