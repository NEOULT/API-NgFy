// Normaliza tildes y caracteres especiales, y limpia el nombre
export function sanitizeFileName(filename) {
    return filename
        .normalize('NFD') // Separa tildes de letras
        .replace(/[\u0300-\u036f]/g, '') // Elimina los signos diacríticos (tildes)
        .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Solo permite letras, números, punto, guion y guion bajo
        .replace(/_+/g, '_'); // Reemplaza múltiples guiones bajos por uno solo
}