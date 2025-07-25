'use strict';

/**
 * API de internacionalización
 *  ▸ Sirve /locales/:lng/:ns.json   (compatible con i18next-http-backend)
 *  ▸ Valida los parámetros para evitar path-traversal
 *  ▸ Responde con Cache-Control (1 h) para aligerar tu servidor
 *
 * © Daniel – jul-2025
 */

const path = require('path');
const fs   = require('fs').promises;

/** ✏️ Mantén sincronizado con tu frontend (src/i18n/config.js) */
const ALLOWED_LANGS = ['es', 'en'];
const ALLOWED_NS    = [
  'common', 'about', 'home', 'settings', 
  'signin', 'signup', 'passwordRecovery',
  'resetPassword', 'privacy',
];

/**
 * @param {import('express').Application} app  — instancia de Express
 * @param {string} ruta                        — prefijo (ej. '/locales')
 */
module.exports = (app, ruta) => {
  app.get(`${ruta}/:lng/:ns.json`, async (req, res) => {
    const { lng, ns } = req.params;

    /* 1. Validación sencilla — 400 si algo no cuadra */
    if (!ALLOWED_LANGS.includes(lng) || !ALLOWED_NS.includes(ns)) {
      return res.status(400).json({ error: 'invalid language or namespace' });
    }

    /* 2. Construcción de la ruta al JSON de forma segura */
    const filePath = path.join(
      process.cwd(),          // raíz del proyecto
      'app',                  // <- carpeta base
      'locales',
      lng,
      `${ns}.json`
    );

    /* 3. Lectura del fichero y envío */
    try {
      const json = await fs.readFile(filePath, 'utf8');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(json);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'translation not found' });
      }
      console.error('[i18n] unexpected error →', err);
      return res.status(500).json({ error: 'internal error' });
    }
  });
};
