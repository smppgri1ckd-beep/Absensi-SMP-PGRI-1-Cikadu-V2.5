import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const zip = new JSZip();

const IGNORED = new Set([
  'node_modules',
  'dist',
  '.git',
  '.vite',
  'dist.zip',
  'project.zip',
  'deps',
  'deps_temp_bdfe823b'
]);

function addPath(currentPath, zipFolder) {
  const items = fs.readdirSync(currentPath);
  for (const item of items) {
    if (IGNORED.has(item)) continue;
    const fullPath = path.join(currentPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const sub = zipFolder.folder(item);
      addPath(fullPath, sub);
    } else {
      const data = fs.readFileSync(fullPath);
      zipFolder.file(item, data);
    }
  }
}

addPath('.', zip);

zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }).then((content) => {
  fs.writeFileSync('./project.zip', content);
  console.log('Successfully created project.zip! Size:', (content.length / 1024).toFixed(1), 'KB');
});
