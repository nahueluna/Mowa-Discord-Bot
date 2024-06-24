module.exports = {
    description: 'Repite los argumentos dados',
    run: async(message) => {
        const args = message.content.split(' ').slice(1).join(' ');

        message.reply(args);
    }
}