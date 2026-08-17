const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');
const { getOffers, addOffer, updateOffer, toggleOfferStatus, deleteOffer } = require('../../controllers/admin/offerController');

router.get('/', adminAuth, getOffers);
router.post('/', adminAuth, addOffer);
router.put('/:id', adminAuth, updateOffer);
router.put('/:id/toggle-status', adminAuth, toggleOfferStatus);
router.delete('/:id', adminAuth, deleteOffer);

module.exports = router;