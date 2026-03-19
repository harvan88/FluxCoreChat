import { Router } from 'express';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const router = Router();

// 🔥 NUEVO: Listar archivos .md de documentación
router.get('/list', (req, res) => {
  try {
    const docsPath = resolve(process.cwd(), 'docs/reconstruction-phase-1/exhaustive-mapping');
    
    // Función recursiva para encontrar todos los archivos .md
    const findMarkdownFiles = (dir: string): string[] => {
      const files: string[] = [];
      
      try {
        const items = readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            files.push(...findMarkdownFiles(fullPath));
          } else if (item.endsWith('.md')) {
            // Convertir a ruta relativa desde docs/
            const relativePath = fullPath.replace(resolve(process.cwd(), 'docs/') + '/', '');
            files.push(relativePath);
          }
        }
      } catch (err) {
        console.warn(`No se pudo leer directorio ${dir}:`, err);
      }
      
      return files;
    };
    
    const markdownFiles = findMarkdownFiles(docsPath);
    
    console.log(`📁 Encontrados ${markdownFiles.length} archivos .md en ${docsPath}`);
    
    res.json({
      files: markdownFiles,
      count: markdownFiles.length
    });
    
  } catch (err) {
    console.error('Error listando archivos .md:', err);
    res.status(500).json({ error: 'No se pudo listar archivos de documentación' });
  }
});

// 🔥 NUEVO: Obtener contenido de un archivo específico
router.get('/content', (req, res) => {
  try {
    const { file } = req.query;
    
    if (!file || typeof file !== 'string') {
      return res.status(400).json({ error: 'Se requiere parámetro "file"' });
    }
    
    // Seguridad: Solo permitir archivos .md dentro de docs/
    if (!file.endsWith('.md') || file.includes('..')) {
      return res.status(400).json({ error: 'Archivo no permitido' });
    }
    
    const filePath = resolve(process.cwd(), 'docs', file);
    
    try {
      const content = readFileSync(filePath, 'utf8');
      res.json({ content });
    } catch (err) {
      console.error(`No se pudo leer archivo ${filePath}:`, err);
      res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
  } catch (err) {
    console.error('Error obteniendo contenido del archivo:', err);
    res.status(500).json({ error: 'No se pudo obtener contenido del archivo' });
  }
});

export default router;
