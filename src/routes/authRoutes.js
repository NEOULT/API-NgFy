import express from 'express';
import Auth from '../controllers/authController.js';

const router = express.Router();

// Se Definen primero las rutas específicas (Aca si esta bien porque no hay dinamicas)

router.post('/signup', Auth.signUp);
router.post('/signin', Auth.signIn);
router.post('/signout', Auth.signOut);

export default router;