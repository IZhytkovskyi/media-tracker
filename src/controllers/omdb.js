// src/controllers/omdb.js

export const getOMDbDetails = async (request, reply) => {
    const { imdbId } = request.params;
    const apiKey = process.env.OMDB_API_KEY;

    if (!apiKey) {
        reply.code(500);
        return { error: 'Не знайдено OMDB_API_KEY в .env' };
    }

    if (!imdbId || imdbId === 'null' || imdbId === 'undefined') {
        reply.code(400);
        return { error: 'IMDb ID відсутній' };
    }

    // Параметр plot=full повертає повний опис (за потреби можна змінити на short)
    const url = `http://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}&plot=full`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Помилка OMDb API: ${response.statusText}`);
        
        const data = await response.json();
        
        // OMDb повертає 200 OK навіть якщо фільм не знайдено, але пише "Response": "False"
        if (data.Response === "False") {
            reply.code(404);
            return { error: data.Error };
        }

        return { data };
    } catch (error) {
        request.log.error(error);
        reply.code(500);
        return { error: 'Помилка отримання даних з OMDb', details: error.message };
    }
};