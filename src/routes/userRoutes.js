import express from 'express';
import UserController from '../controllers/userController.js';
import { verifyToken } from '../services/authService.js';
import userController from '../controllers/userController.js';

const router = express.Router();

// CRUD Básico (heredado de BaseController)
router.get('/all', UserController.getAll)
router.put('/softDelete/:id', verifyToken, UserController.softDelete); // PUT /users/softDelete/:id
router.put('/profile', verifyToken, UserController.updateUserProfile); // PATCH /users/settings/:id
router.post('/', UserController.create);  // POST /users
router.get('/profile',verifyToken,userController.getProfile)
router.get('/toggleFavorite/:id',verifyToken,userController.toggleFavorite)

router.route('/')
    .all(verifyToken) // Middleware de autenticación
    .get(UserController.getOne)    // GET /users/:id
    .put(UserController.update)  // PATCH /users/:id
    .delete(UserController.delete); // DELETE /users/:id

export default router;