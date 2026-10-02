import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const zip = new JSZip();
const distDir = path.resolve('./dist');

function addFolderToZip(folderPath, zipFolder) {
  const items = fs.readdirSync(folderPath);
  for (const item of items) {
    const fullPath = path.join(folderPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const subZip = zipFolder.folder(item);
      addFolderToZip(fullPath, subZip);
    } else {
      const fileData = fs.readFileSync(fullPath);
      zipFolder.file(item, fileData);
    }
  }
}

if (fs.existsSync(distDir)) {
  addFolderToZip(distDir, zip);
  zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }).then((content) => {
    fs.writeFileSync('./dist.zip', content);
    console.log('Successfully generated dist.zip! Size:', (content.length / 1024).toFixed(1), 'KB');
  });
} else {
  console.error('dist folder not found. Run npm run build first.');
}
