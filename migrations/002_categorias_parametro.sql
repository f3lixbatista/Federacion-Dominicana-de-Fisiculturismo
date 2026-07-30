-- Migración 002: columna `parametro` en categorías
-- Permite almacenar el tipo de clasificación de la división al guardar una categoría.
-- Valores válidos: peso | estatura | relacion | ambos | ninguno
-- `relacion` = clase de estatura con peso máximo (Classic Physique, Games Classic, Fisiculturismo Clásico)

ALTER TABLE categorias
    ADD COLUMN IF NOT EXISTS parametro TEXT DEFAULT 'ninguno';

-- Categorías existentes con peso_max y estatura_min/max se actualizan a 'relacion'
-- (aquellas que tienen rango de estatura Y peso_max = disciplinas tipo Classic)
UPDATE categorias
SET parametro = 'relacion'
WHERE estatura_min IS NOT NULL
  AND estatura_max IS NOT NULL
  AND peso_max IS NOT NULL
  AND parametro = 'ninguno';

-- Categorías con solo rango de peso
UPDATE categorias
SET parametro = 'peso'
WHERE peso_min IS NOT NULL
  AND estatura_min IS NULL
  AND parametro = 'ninguno';

-- Categorías con solo rango de estatura
UPDATE categorias
SET parametro = 'estatura'
WHERE estatura_min IS NOT NULL
  AND peso_min IS NULL
  AND peso_max IS NULL
  AND parametro = 'ninguno';
