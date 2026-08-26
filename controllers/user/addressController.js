const User = require('../../models/User');

// GET /api/users/address - list all addresses for logged-in user
exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('addresses');
    if (!user) return res.status(404).json({ message: 'Account not found' });
    res.status(200).json({ addresses: user.addresses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to list all addresses. Please try again.' });
  }
};

// POST /api/users/address - add a new address
exports.addAddress = async (req, res) => {
  try {
    const { label, fullName, phone, pincode, state, city, fullAddress, isDefault } = req.body;

    const errors = {};
 

    if (!phone || phone.trim() === '') {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phone)) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!pincode || pincode.trim() === '') {
      errors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(pincode)) {
      errors.pincode = 'Pincode must be exactly 6 digits';
    }

    if (!state) {
      errors.state = 'Please select a state';
    }
    if (!city || city.trim() === '') {
      errors.city = 'City is required';
    }
    if (!fullAddress || fullAddress.trim() === '') {
      errors.fullAddress = 'Full address is required';
    }
    if (!label) {
      errors.label = 'Please select an address type';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Please fix the errors below', errors });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'Account not found' });

    const MAX_ADDRESSES = 5;
    if (user.addresses.length >= MAX_ADDRESSES) {
      return res.status(400).json({ message: `You can save a maximum of ${MAX_ADDRESSES} addresses` });
    }

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
    res.status(500).json({ message: 'Failed to save address. Please try again.' });
  }
};

// PUT /api/users/address/:addressId - edit an existing address
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const { label, fullName, phone, pincode, state, city, fullAddress, isDefault } = req.body;

   const errors = {};

    if (!fullName || fullName.trim() === '') {
      errors.fullName = 'Full name is required';
    } else if (!/^[A-Za-z\s]+$/.test(fullName.trim())) {
      errors.fullName = 'Name can only contain letters, no numbers';
    }

    if (!phone || phone.trim() === '') {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phone)) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!pincode || pincode.trim() === '') {
      errors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(pincode)) {
      errors.pincode = 'Pincode must be exactly 6 digits';
    }

    if (!state) {
      errors.state = 'Please select a state';
    }
    if (!city || city.trim() === '') {
      errors.city = 'City is required';
    }
    if (!fullAddress || fullAddress.trim() === '') {
      errors.fullAddress = 'Full address is required';
    }
    if (!label) {
      errors.label = 'Please select an address type';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Please fix the errors below', errors });
    }


    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ message: 'Account not found' });

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
    res.status(500).json({ message: 'Failed to update address. Please try again.' });
  }
};

// DELETE /api/users/address/:addressId
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'Account not found' });

    user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);
    await user.save();

    res.status(200).json({ message: 'Address deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete address. Please try again.' });
  }
};