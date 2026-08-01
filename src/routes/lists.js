// src/routes/lists.js
import { 
    getAllLists, createList, updateList, deleteList,
    getListItems, addMediaToList, removeMediaFromList, getListsForMedia 
} from '../controllers/lists.js';

const listSchema = {
    body: {
        type: 'object',
        required: ['name'],
        properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: ['string', 'null'] }
        }
    }
};

const listItemSchema = {
    body: {
        type: 'object',
        required: ['media_id'],
        properties: {
            media_id: { type: 'integer' }
        }
    }
};

export default async function listRoutes(fastify, options) {
    // CRUD для самих списків
    fastify.get('/lists', getAllLists);
    fastify.post('/lists', { schema: listSchema }, createList);
    fastify.patch('/lists/:id', { schema: listSchema }, updateList);
    fastify.delete('/lists/:id', deleteList);

    // Додавання/видалення медіа всередині списків
    fastify.get('/lists/:id/items', getListItems);
    fastify.post('/lists/:id/items', { schema: listItemSchema }, addMediaToList);
    fastify.delete('/lists/:id/items/:media_id', removeMediaFromList);
    
    // Отримати списки, у яких міститься конкретне медіа
    fastify.get('/media/:media_id/lists', getListsForMedia);
}