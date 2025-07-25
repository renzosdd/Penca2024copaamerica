const { LANGUAGE } = require('../config');

const translations = {
  es: {
    USER_NOT_FOUND: 'Usuario no encontrado',
    INCORRECT_PASSWORD: 'Contraseña incorrecta',
    INTERNAL_ERROR: 'Error interno del servidor',
    USER_EXISTS: 'El nombre de usuario o email ya existe',
    UNAUTHORIZED: 'No autorizado',
    INVALID_RESULTS: 'Resultados inválidos',
    NEGATIVE_GOALS: 'Los goles no pueden ser negativos',
    PENCA_ID_REQUIRED: 'pencaId requerido',
    NOT_IN_PENCA: 'No pertenece a la penca',
    MATCH_NOT_FOUND: 'Partido no encontrado',
    PREDICTION_TIME: 'No se puede enviar la predicción dentro de los 30 minutos previos al inicio del partido',
    PREDICTION_SAVED: 'Predicción guardada',
    PREDICTION_SAVE_ERROR: 'Error al guardar la predicción',
    PREDICTIONS_FETCH_ERROR: 'Error al obtener predicciones',
    ERROR_LISTING_PENCAS: 'Error listing pencas',
    ERROR_GETTING_PENCAS: 'Error getting pencas',
    ERROR_CREATING_PENCA: 'Error creating penca',
    PENCA_NOT_FOUND: 'Penca not found',
    FORBIDDEN: 'Forbidden',
    ERROR_GETTING_PENCA: 'Error getting penca',
    ERROR_UPDATING_PENCA: 'Error updating penca',
    PENCA_UPDATED: 'Penca actualizada',
    MAX_PENCAS_REACHED: 'You have reached the maximum number of pencas you can join',
    ALREADY_REQUESTED_OR_MEMBER: 'Already requested or member',
    PENCA_IS_FULL: 'Penca is full',
    ERROR_JOINING_PENCA: 'Error joining penca',
    REQUEST_SENT: 'Request sent',
    PARTICIPANT_APPROVED: 'Participant approved',
    ERROR_APPROVING_PARTICIPANT: 'Error approving participant',
    PARTICIPANT_REMOVED: 'Participant removed',
    ERROR_REMOVING_PARTICIPANT: 'Error removing participant',
    ADMIN_ONLY: 'Admins must use /admin/edit',
    DASHBOARD_ERROR: 'Error retrieving dashboard data',
    OWNER_ONLY: 'Owners only',
    OWNER_DATA_ERROR: 'Error retrieving owner data',
    LOGOUT_ERROR: 'Error al cerrar sesión',
    AVATAR_NOT_FOUND: 'Avatar no encontrado',
    AVATAR_ERROR: 'Error al recuperar el avatar',
    PAGE_NOT_FOUND: '404: Página no encontrada',
    RANKING_ERROR: 'Error al obtener el ranking',
    SCORES_RECALC_ERROR: 'Error al recalcular los puntajes',
    SCORES_RECALCULATED: 'Puntajes recalculados correctamente'
  },
  en: {
    USER_NOT_FOUND: 'User not found',
    INCORRECT_PASSWORD: 'Incorrect password',
    INTERNAL_ERROR: 'Internal server error',
    USER_EXISTS: 'Username or email already exists',
    UNAUTHORIZED: 'Unauthorized',
    INVALID_RESULTS: 'Invalid results',
    NEGATIVE_GOALS: 'Goals cannot be negative',
    PENCA_ID_REQUIRED: 'pencaId required',
    NOT_IN_PENCA: 'You do not belong to the penca',
    MATCH_NOT_FOUND: 'Match not found',
    PREDICTION_TIME: 'Cannot submit prediction within 30 minutes of kickoff',
    PREDICTION_SAVED: 'Prediction saved',
    PREDICTION_SAVE_ERROR: 'Error saving prediction',
    PREDICTIONS_FETCH_ERROR: 'Error fetching predictions',
    ERROR_LISTING_PENCAS: 'Error listing pencas',
    ERROR_GETTING_PENCAS: 'Error getting pencas',
    ERROR_CREATING_PENCA: 'Error creating penca',
    PENCA_NOT_FOUND: 'Penca not found',
    FORBIDDEN: 'Forbidden',
    ERROR_GETTING_PENCA: 'Error getting penca',
    ERROR_UPDATING_PENCA: 'Error updating penca',
    PENCA_UPDATED: 'Penca updated',
    MAX_PENCAS_REACHED: 'You have reached the maximum number of pencas you can join',
    ALREADY_REQUESTED_OR_MEMBER: 'Already requested or member',
    PENCA_IS_FULL: 'Penca is full',
    ERROR_JOINING_PENCA: 'Error joining penca',
    REQUEST_SENT: 'Request sent',
    PARTICIPANT_APPROVED: 'Participant approved',
    ERROR_APPROVING_PARTICIPANT: 'Error approving participant',
    PARTICIPANT_REMOVED: 'Participant removed',
    ERROR_REMOVING_PARTICIPANT: 'Error removing participant',
    ADMIN_ONLY: 'Admins must use /admin/edit',
    DASHBOARD_ERROR: 'Error retrieving dashboard data',
    OWNER_ONLY: 'Owners only',
    OWNER_DATA_ERROR: 'Error retrieving owner data',
    LOGOUT_ERROR: 'Error logging out',
    AVATAR_NOT_FOUND: 'Avatar not found',
    AVATAR_ERROR: 'Error retrieving avatar',
    PAGE_NOT_FOUND: '404: Page not found',
    RANKING_ERROR: 'Error retrieving ranking',
    SCORES_RECALC_ERROR: 'Error recalculating scores',
    SCORES_RECALCULATED: 'Scores recalculated successfully'
  }
};

function getMessage(key, lang = LANGUAGE) {
  const msgs = translations[lang] || translations.es;
  return msgs[key] || translations.es[key] || key;
}

module.exports = { getMessage, translations };
