//Estos son los distintos niveles que existen
const LogLevel = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
    CRITICAL: 'CRITICAL'
};

class Logger {
    
    static instance;

    constructor({ levels = {} } = {}) {
    if (Logger.instance) {
        return Logger.instance; // Reusar instancia si ya existe
    }

    // Aca se definen los niveles de logueo y se pueden agregar o quitar niveles
    this.levels = {
        INFO: true,
        WARNING: true,
        ERROR: true,
        DEBUG: false,
        CRITICAL: false,
        ...levels
    };

    Logger.instance = this;
    }

    //Funcion que se encarga de loguear los mensajes con el formato deseado
    #log(type, message) {
    if (!this.levels[type]) return;

    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(formattedMessage);
    }
    
    //Estos son los metodos que se pueden usar para loguear los mensajes segun el nivel
    info(msg)     { this.#log(LogLevel.INFO, msg); }
    warning(msg)  { this.#log(LogLevel.WARNING, msg); }
    error(msg)    { this.#log(LogLevel.ERROR, msg); }
    debug(msg)    { this.#log(LogLevel.DEBUG, msg); }
    critical(msg) { this.#log(LogLevel.CRITICAL, msg); }
}

export default new Logger();
