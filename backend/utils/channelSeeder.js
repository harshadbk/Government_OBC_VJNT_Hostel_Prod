import Channel from '../models/Channel.js';

export const seedDefaultChannels = async () => {
  try {
    const defaultChannels = [
      {
        name: 'Announcements',
        type: 'announcement',
        description: 'Official hostel announcements, administration notices, and updates.',
        isDefault: true,
        isActive: true,
      },
      {
        name: 'General',
        type: 'general',
        description: 'General discussion channel for verified hostel residents.',
        isDefault: true,
        isActive: true,
      },
    ];

    for (const ch of defaultChannels) {
      await Channel.findOneAndUpdate(
        { name: ch.name },
        { $setOnInsert: ch },
        { upsert: true, new: true, runValidators: true }
      );
    }
    console.log('Default community channels verified/seeded.');
  } catch (error) {
    console.error('Error seeding default channels:', error.message);
  }
};
