const express = require('express');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Create coordinator (Admin only)
router.post('/coordinators', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, eventName } = req.body;

    if (!name || !email || !password || !eventName) {
      return res.status(400).json({ message: 'Name, email, password, and event name are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const coordinator = await User.create({
      name,
      email,
      password,
      role: 'coordinator',
      organization: eventName,
    });

    res.status(201).json({
      message: 'Coordinator created successfully',
      coordinator: { id: coordinator.id, name: coordinator.name, email: coordinator.email, eventName: coordinator.organization },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all coordinators (Admin only)
router.get('/coordinators', auth, adminOnly, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const where = { role: 'coordinator' };

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { organization: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * parseInt(limit);

    const { count: total, rows: coordinators } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(limit),
    });

    // Get certificate count for each coordinator
    const coordinatorsWithStats = await Promise.all(
      coordinators.map(async (coord) => {
        const certCount = await Certificate.count({ where: { issuedBy: coord.id } });
        return { ...coord.toJSON(), certificateCount: certCount };
      })
    );

    res.json({
      coordinators: coordinatorsWithStats,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Toggle coordinator active status (Admin only)
router.patch('/coordinators/:id/toggle-status', auth, adminOnly, async (req, res) => {
  try {
    const coordinator = await User.findByPk(req.params.id);
    if (!coordinator || coordinator.role !== 'coordinator') {
      return res.status(404).json({ message: 'Coordinator not found.' });
    }

    coordinator.isActive = !coordinator.isActive;
    await coordinator.save();

    res.json({ message: `Coordinator ${coordinator.isActive ? 'activated' : 'deactivated'} successfully`, coordinator });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete coordinator (Admin only)
router.delete('/coordinators/:id', auth, adminOnly, async (req, res) => {
  try {
    const coordinator = await User.findByPk(req.params.id);
    if (!coordinator || coordinator.role !== 'coordinator') {
      return res.status(404).json({ message: 'Coordinator not found.' });
    }

    await coordinator.destroy();
    res.json({ message: 'Coordinator deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all certificates (Admin only)
router.get('/certificates', auth, adminOnly, async (req, res) => {
  try {
    const { search, type, page = 1, limit = 10 } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { recipientName: { [Op.iLike]: `%${search}%` } },
        { eventName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (type) where.certificateType = type;

    const offset = (page - 1) * parseInt(limit);

    const { count: total, rows: certificates } = await Certificate.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(limit),
      include: [{ model: User, as: 'issuer', attributes: ['name', 'email', 'organization'] }],
    });

    res.json({
      certificates,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete all certificates (Admin only)
router.delete('/certificates/all', auth, adminOnly, async (req, res) => {
  try {
    const count = await Certificate.destroy({ where: {} });
    res.json({ message: `Successfully deleted ${count} certificates` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Revoke / restore certificate (Admin only)
router.patch('/certificates/:id/toggle-validity', auth, adminOnly, async (req, res) => {
  try {
    const certificate = await Certificate.findByPk(req.params.id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found.' });
    }

    certificate.isValid = !certificate.isValid;
    await certificate.save();

    res.json({
      message: `Certificate ${certificate.isValid ? 'restored' : 'revoked'} successfully`,
      certificate,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Dashboard stats (Admin only)
router.get('/dashboard', auth, adminOnly, async (req, res) => {
  try {
    const totalCertificates = await Certificate.count();
    const totalCoordinators = await User.count({ where: { role: 'coordinator' } });
    const activeCertificates = await Certificate.count({ where: { isValid: true } });
    const revokedCertificates = await Certificate.count({ where: { isValid: false } });

    const totalVerificationsResult = await Certificate.sum('verificationCount');
    const totalVerifications = totalVerificationsResult || 0;

    const recentCertificates = await Certificate.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [{ model: User, as: 'issuer', attributes: ['name', 'organization'] }],
    });

    res.json({
      stats: {
        totalCertificates,
        totalCoordinators,
        activeCertificates,
        revokedCertificates,
        totalVerifications,
      },
      recentCertificates,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
