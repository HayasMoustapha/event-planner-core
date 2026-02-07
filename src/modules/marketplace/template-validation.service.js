const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const sharp = require('sharp');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const axios = require('axios');

const REQUIRED_VARIABLES = [
  'EVENT_TITLE',
  'EVENT_DATE',
  'EVENT_TIME',
  'EVENT_LOCATION',
  'GUEST_NAME',
  'GUEST_EMAIL',
  'TICKET_CODE',
  'QR_CODE',
  'ORGANIZER_NAME'
];

const OPTIONAL_VARIABLES = [
  'EVENT_TYPE',
  'ISSUED_AT'
];

const SAMPLE_DATA = {
  EVENT_TITLE: 'Sample Event',
  EVENT_TYPE: 'Standard',
  EVENT_DATE: '2026-01-01',
  EVENT_TIME: '18:00',
  EVENT_LOCATION: 'Event Hall',
  GUEST_NAME: 'John Doe',
  GUEST_EMAIL: 'john.doe@example.com',
  TICKET_CODE: 'TICKET-0001',
  ORGANIZER_NAME: 'Event Planner',
  ISSUED_AT: '2026-01-01 12:00'
};

function replaceVariables(html, variables) {
  let output = html;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    output = output.replace(regex, value);
  });
  return output;
}

async function computeSimilarity(bufferA, bufferB, width, height) {
  const { data: dataA } = await sharp(bufferA)
    .resize(width, height, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: dataB } = await sharp(bufferB)
    .resize(width, height, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let diffSum = 0;
  for (let i = 0; i < dataA.length; i += 1) {
    diffSum += Math.abs(dataA[i] - dataB[i]);
  }

  const maxDiff = 255 * dataA.length;
  return 1 - diffSum / maxDiff;
}

class TemplateValidationService {
  async validateTemplatePackage(sourceFilesPath, previewUrl) {
    let workingDir = null;
    try {
      // Préparer un workspace temporaire pour inspecter le template
      const prepared = await this.prepareTemplateWorkspace(sourceFilesPath, previewUrl);
      workingDir = prepared.workingDir;

      const { indexPath, previewPath, previewBuffer } = prepared;
      const indexHtml = await fs.readFile(indexPath, 'utf8');

      // Vérifier la présence des variables obligatoires
      const missingVariables = this.getMissingVariables(indexHtml);
      if (missingVariables.length > 0) {
        return {
          valid: false,
          reason: `Variables manquantes: ${missingVariables.join(', ')}`,
          details: { missingVariables }
        };
      }

      // Rendre l'HTML avec des données fixes et comparer au preview
      const rendered = await this.renderHtmlToPng(indexPath, indexHtml, previewBuffer);
      const similarity = await computeSimilarity(previewBuffer, rendered.buffer, rendered.width, rendered.height);

      if (similarity < 0.8) {
        return {
          valid: false,
          reason: `Preview différent du rendu (similarité ${(similarity * 100).toFixed(1)}%)`,
          details: { similarity }
        };
      }

      return {
        valid: true,
        reason: 'Template validé',
        details: { similarity }
      };
    } catch (error) {
      return {
        valid: false,
        reason: error.message || 'Erreur validation template',
        details: { error: error.message }
      };
    } finally {
      if (workingDir) {
        // Nettoyage du workspace temporaire
        await fs.rm(workingDir, { recursive: true, force: true });
      }
    }
  }

  async prepareTemplateWorkspace(sourceFilesPath, previewUrl) {
    if (!sourceFilesPath) {
      throw new Error('source_files_path manquant');
    }

    const workingDir = path.join(os.tmpdir(), `event-planner-template-${crypto.randomUUID()}`);
    await fs.mkdir(workingDir, { recursive: true });

    let templateRoot = workingDir;
    if (sourceFilesPath.startsWith('http://') || sourceFilesPath.startsWith('https://')) {
      // Source distante: téléchargement du zip
      const zipBuffer = await this.downloadFile(sourceFilesPath);
      const zipPath = path.join(workingDir, 'template.zip');
      await fs.writeFile(zipPath, zipBuffer);
      templateRoot = await this.extractZip(zipPath, workingDir);
    } else {
      // Source locale: dossier ou zip
      const resolvedPath = path.resolve(sourceFilesPath);
      const stat = await fs.stat(resolvedPath);
      if (stat.isDirectory()) {
        templateRoot = resolvedPath;
      } else if (resolvedPath.endsWith('.zip')) {
        templateRoot = await this.extractZip(resolvedPath, workingDir);
      } else {
        throw new Error('source_files_path doit être un dossier ou un zip');
      }
    }

    let indexPath = path.join(templateRoot, 'index.html');
    let previewPath = previewUrl
      ? path.resolve(previewUrl)
      : path.join(templateRoot, 'preview.png');

    indexPath = await this.ensureFileExists(indexPath, templateRoot, 'index.html');

    let previewBuffer;
    if (previewUrl && (previewUrl.startsWith('http://') || previewUrl.startsWith('https://'))) {
      previewBuffer = await this.downloadFile(previewUrl);
      previewPath = path.join(workingDir, 'preview.png');
      await fs.writeFile(previewPath, previewBuffer);
    } else {
      previewPath = await this.ensureFileExists(previewPath, templateRoot, 'preview.png');
      previewBuffer = await fs.readFile(previewPath);
    }

    return {
      workingDir,
      templateRoot,
      indexPath,
      previewPath,
      previewBuffer
    };
  }

  async extractZip(zipPath, targetDir) {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(targetDir, true);
    return targetDir;
  }

  async ensureFileExists(expectedPath, searchRoot, filename) {
    try {
      await fs.access(expectedPath);
      return expectedPath;
    } catch (error) {
      const fallback = await this.findFileRecursive(searchRoot, filename);
      if (fallback) {
        return fallback;
      }
      throw new Error(`${filename} manquant dans le template`);
    }
  }

  async findFileRecursive(rootDir, filename) {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isFile() && entry.name === filename) {
        return fullPath;
      }
      if (entry.isDirectory()) {
        const nested = await this.findFileRecursive(fullPath, filename);
        if (nested) return nested;
      }
    }
    return null;
  }

  async downloadFile(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }

  getMissingVariables(html) {
    return REQUIRED_VARIABLES.filter((variable) => {
      const regex = new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'g');
      return !regex.test(html);
    });
  }

  async renderHtmlToPng(indexPath, html, previewBuffer) {
    const metadata = await sharp(previewBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    const qrCodeDataUrl = await QRCode.toDataURL('SAMPLE-TICKET-QR');
    const variables = {
      ...SAMPLE_DATA,
      QR_CODE: qrCodeDataUrl
    };

    const baseHref = `file://${path.dirname(indexPath)}/`;
    const htmlWithBase = `<base href="${baseHref}">` + replaceVariables(html, variables);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width, height });
      await page.setContent(htmlWithBase, { waitUntil: 'networkidle0' });
      const buffer = await page.screenshot({ type: 'png', fullPage: true });
      return { buffer, width, height };
    } finally {
      await browser.close();
    }
  }
}

module.exports = new TemplateValidationService();
