import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, '..', 'public', 'showcase', 'videos');
const showcaseDir = path.join(__dirname, '..', 'public', 'showcase');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const projects = [
  {
    id: '01_osforge_studio',
    image: 'osforge-studio.jpg',
    duration: 6,
    zoom: "zoompan=z='min(zoom+0.0012,1.15)':d=180:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30"
  },
  {
    id: '02_grimoire_vtt',
    image: 'grimoire-vtt.jpg',
    duration: 6,
    zoom: "zoompan=z='min(zoom+0.0012,1.15)':d=180:x='iw/3-(iw/zoom/3)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30"
  },
  {
    id: '03_madgrav_laser',
    image: 'madgrav-laser-rog.jpg',
    duration: 6,
    zoom: "zoompan=z='min(zoom+0.0012,1.15)':d=180:x='iw*0.6-(iw/zoom*0.6)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30"
  },
  {
    id: '04_madtweak_windows',
    image: 'madtweak-optimizer.jpg',
    duration: 6,
    zoom: "zoompan=z='min(zoom+0.0012,1.15)':d=180:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30"
  },
  {
    id: '05_mados_rog_edition',
    image: 'mados-rog-edition.jpg',
    duration: 6,
    zoom: "zoompan=z='min(zoom+0.0012,1.15)':d=180:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30"
  },
  {
    id: '06_welcome_to_the_lab',
    image: 'welcome-patreon-banner.jpg',
    duration: 6,
    zoom: "zoompan=z='min(zoom+0.0012,1.15)':d=180:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30"
  },
  {
    id: '00_ecosystem_overview',
    image: 'ecosystem-banner.jpg',
    duration: 7,
    zoom: "zoompan=z='min(zoom+0.001,1.15)':d=210:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30"
  }
];

console.log('Generating project videos...');

for (const proj of projects) {
  const inputImg = path.join(showcaseDir, proj.image);
  const outputMp4 = path.join(outputDir, `${proj.id}.mp4`);
  
  console.log(`Rendering ${proj.id}.mp4 from ${proj.image}...`);
  const cmd = `ffmpeg -y -loop 1 -i "${inputImg}" -vf "${proj.zoom},fade=t=in:st=0:d=0.5,fade=t=out:st=${proj.duration - 0.5}:d=0.5" -t ${proj.duration} -c:v libx264 -pix_fmt yuv420p -b:v 4M "${outputMp4}"`;
  execSync(cmd, { stdio: 'inherit' });
}

// Generate the Master Compilation Trailer
console.log('Building Master Compilation Trailer...');
const concatList = path.join(outputDir, 'concat_list.txt');
const listContent = projects
  .map(p => `file '${path.join(outputDir, `${p.id}.mp4`).replace(/\\/g, '/')}'`)
  .join('\n');

fs.writeFileSync(concatList, listContent);

const masterTrailer = path.join(outputDir, 'master_ecosystem_trailer.mp4');
execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${masterTrailer}"`, { stdio: 'inherit' });
fs.unlinkSync(concatList);

console.log('All videos successfully rendered in ' + outputDir);
