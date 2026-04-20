const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const metaTags = `    <meta name="description" content="Insurify - Smart Claims Management Made Simple. Fast, transparent, and reliable." />
    <meta name="keywords" content="insurance, claims, coverage, auto insurance, home insurance, health, business" />
    <meta property="og:title" content="Insurify Claims Management" />
    <meta property="og:description" content="Compare, choose, and manage insurance with confidence." />
    <meta property="og:type" content="website" />`;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('name="description"')) {
    content = content.replace(/<title>(.*?)<\/title>/, `<title>$1</title>\n${metaTags}`);
    fs.writeFileSync(filePath, content);
    console.log(`Optimized ${file}`);
  }
});
