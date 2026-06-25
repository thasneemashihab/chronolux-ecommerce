const User = require('../../models/User');

// GET /api/users/address - list all addresses for logged-in user
exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('addresses');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ addresses: user.addresses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/users/address - add a new address
exports.addAddress = async (req, res) => {
  try {
    const { label, fullName, phone, pincode, state, city, fullAddress, isDefault } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If this address is set as default, unset default on all others first
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push({
      label, fullName, phone, pincode, state, city, fullAddress,
      isDefault: !!isDefault
    });

    await user.save();
    res.status(201).json({ message: 'Address added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/users/address/:addressId - edit an existing address
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, fullName, phone, pincode, state, city, fullAddress, isDefault } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const address = user.addresses.id(addressId);
    if (!address) return res.status(404).json({ message: 'Address not found' });

    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    address.label = label;
    address.fullName = fullName;
    address.phone = phone;
    address.pincode = pincode;
    address.state = state;
    address.city = city;
    address.fullAddress = fullAddress;
    address.isDefault = !!isDefault;

    await user.save();
    res.status(200).json({ message: 'Address updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/users/address/:addressId
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);
    await user.save();

    res.status(200).json({ message: 'Address deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};