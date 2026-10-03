import { db } from '../db/index.js';

export function getFavorites(req, res) {
  try {
    const favorites = db.prepare(`
      SELECT id, title, url, category, icon, created_at
      FROM favorites
      ORDER BY category ASC, id ASC
    `).all();

    // Agrupar por categoría para fácil consumo en frontend
    const grouped = {};
    for (const fav of favorites) {
      if (!grouped[fav.category]) {
        grouped[fav.category] = [];
      }
      grouped[fav.category].push(fav);
    }

    return res.json({
      favorites,
      categories: grouped
    });
  } catch (error) {
    console.error('[Favoritos] Error al obtener favoritos:', error);
    return res.status(500).json({ error: 'Error al consultar catálogo de favoritos.' });
  }
}

export function createFavorite(req, res) {
  const { title, url, category = 'Personalizados', icon = 'globe' } = req.body || {};

  if (!title || !url) {
    return res.status(400).json({ error: 'El título y la dirección URL son obligatorios.' });
  }

  const cleanUrl = url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');

  try {
    const insert = db.prepare(`
      INSERT INTO favorites (title, url, category, icon)
      VALUES (?, ?, ?, ?)
    `);
    const result = insert.run(title.trim(), cleanUrl, category.trim(), icon);

    return res.json({
      success: true,
      id: result.lastInsertRowid,
      title: title.trim(),
      url: cleanUrl,
      category: category.trim(),
      icon,
      message: 'Página favorita agregada exitosamente.'
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Esta dirección web ya existe en los favoritos.' });
    }
    console.error('[Favoritos] Error al crear favorito:', error);
    return res.status(500).json({ error: 'Error al guardar página favorita.' });
  }
}

export function deleteFavorite(req, res) {
  const { id } = req.params;

  try {
    const result = db.prepare('DELETE FROM favorites WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Favorito no encontrado.' });
    }

    return res.json({
      success: true,
      message: 'Página removida del catálogo de favoritos.'
    });
  } catch (error) {
    console.error('[Favoritos] Error al eliminar favorito:', error);
    return res.status(500).json({ error: 'Error al eliminar página favorita.' });
  }
}

export function resetDefaults(req, res) {
  try {
    const defaultFavorites = [
      { title: 'Facebook', url: 'facebook.com', category: 'Redes Sociales', icon: 'share-2' },
      { title: 'Instagram', url: 'instagram.com', category: 'Redes Sociales', icon: 'camera' },
      { title: 'TikTok', url: 'tiktok.com', category: 'Redes Sociales', icon: 'music' },
      { title: 'X (Twitter)', url: 'x.com', category: 'Redes Sociales', icon: 'twitter' },
      { title: 'YouTube (Completo)', url: 'youtube.com', category: 'Videos y Streaming', icon: 'youtube' },
      { title: 'YouTube Shorts', url: 'youtube.com/shorts', category: 'Videos y Streaming', icon: 'film' },
      { title: 'Netflix', url: 'netflix.com', category: 'Videos y Streaming', icon: 'tv' },
      { title: 'Twitch', url: 'twitch.tv', category: 'Videos y Streaming', icon: 'video' },
      { title: 'Cuevana', url: 'cuevana.pro', category: 'Videos y Streaming', icon: 'play' },
      { title: 'Roblox', url: 'roblox.com', category: 'Juegos Web', icon: 'gamepad-2' },
      { title: 'Poki', url: 'poki.com', category: 'Juegos Web', icon: 'joystick' },
      { title: 'Friv', url: 'friv.com', category: 'Juegos Web', icon: 'smile' }
    ];

    const reset = db.transaction(() => {
      db.prepare('DELETE FROM favorites').run();
      const insertFav = db.prepare(`
        INSERT INTO favorites (title, url, category, icon)
        VALUES (@title, @url, @category, @icon)
      `);
      for (const fav of defaultFavorites) {
        insertFav.run(fav);
      }
    });

    reset();

    return res.json({
      success: true,
      message: 'Catálogo de favoritos restablecido a los valores predeterminados.'
    });
  } catch (error) {
    console.error('[Favoritos] Error al restablecer favoritos:', error);
    return res.status(500).json({ error: 'Error al restablecer catálogo.' });
  }
}

