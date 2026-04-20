const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const scripts = `
  <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
  <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"></script>
  <script src="firebase-config.js"></script>`;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (content.includes('<script src="api-client.js"></script>') && !content.includes('firebase-app.js')) {
    content = content.replace('<script src="api-client.js"></script>', `${scripts}\n  <script src="api-client.js"></script>`);
    fs.writeFileSync(filePath, content);
    console.log(`Injected Firebase into ${file}`);
  }
});
