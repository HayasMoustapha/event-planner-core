const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration du stockage temporaire pour les fichiers uploadés
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../temp/uploads');
    
    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique avec timestamp et extension originale
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `guests-import-${uniqueSuffix}${ext}`);
  }
});

// Filtre pour valider les types de fichiers autorisés
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain' // Pour les fichiers CSV depuis curl
  ];
  
  const allowedExtensions = ['.csv', '.xls', '.xlsx'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  // Accepter si l'extension est valide (priorité à l'extension sur le MIME type)
  if (allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV, XLS and XLSX files are allowed'), false);
  }
};

// Configuration de Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1 // Un seul fichier à la fois
  }
});

// Middleware pour l'upload de fichiers d'import d'invités
// Accepte plusieurs noms de champs pour éviter l'erreur "Unexpected field"
const uploadGuestsFile = (req, res, next) => {
  // Essayer avec 'file' d'abord
  const uploadSingle = upload.single('file');
  
  uploadSingle(req, res, (err) => {
    if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
      // Si 'file' ne fonctionne pas, essayer avec 'guests_file'
      const uploadGuests = upload.single('guests_file');
      
      uploadGuests(req, res, (guestsErr) => {
        if (guestsErr && guestsErr.code === 'LIMIT_UNEXPECTED_FILE') {
          // Si 'guests_file' ne fonctionne pas, essayer avec 'csv'
          const uploadCsv = upload.single('csv');
          
          uploadCsv(req, res, next);
        } else {
          next(guestsErr);
        }
      });
    } else {
      next(err);
    }
  });
};

module.exports = {
  uploadGuestsFile
};
