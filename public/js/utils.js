export const getFlagImageName = (team) => {
    const flags = {
        'Argentina': 'argentina',
        'Bolivia': 'bolivia',
        'Brasil': 'brasil',
        'Chile': 'chile',
        'Colombia': 'colombia',
        'Ecuador': 'ecuador',
        'Paraguay': 'paraguay',
        'Perú': 'peru',
        'Uruguay': 'uruguay',
        'Venezuela': 'venezuela',
        'Canadá': 'canada',
        'México': 'mexico',
        'Estados Unidos': 'estadosunidos',
        'Jamaica': 'jamaica',
        'Panamá': 'panama',
        'Costa Rica': 'costarica',
        // Otros equipos si es necesario
    };
    return flags[team] || 'default';
};
