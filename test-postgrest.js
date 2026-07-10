const { createClient } = require('@supabase/supabase-js');

// Configuração do cliente Supabase a partir das credenciais do .env.local
const supabaseUrl = 'https://bqwngfmeyhqtirndfpnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxd25nZm1leWhxdGlybmRmcG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTQ1MjgsImV4cCI6MjA5Nzc5MDUyOH0.rV4d1xvCiTZN2WarOCLaoPeQKYPbEkFo95KP_FJgYnc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const fs = require('fs');
const path = require('path');

async function testQuery() {
  console.log('Searching compras-page-client.tsx...');
  const filePath = path.join(__dirname, 'src/components/compras/compras-page-client.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (line.includes('activeTab') || line.includes('border-b') || line.includes('role="tab"')) {
      console.log(`Line ${index + 1}: ${line.trim()}`);
    }
  });
}

testQuery();
