const { User, Conversation, Message, ConversationParticipants } = require('./models');
const sequelize = require('./config/database');

async function debugChat() {
  try {
    const users = await User.findAll({ limit: 2 });
    if (users.length < 2) {
      console.log('Not enough users to test chat');
      return;
    }

    const u1 = users[0];
    const u2 = users[1];

    console.log(`Testing chat between ${u1.id} and ${u2.id}`);

    // Test find existing
    const existing = await u1.getConversations({
      include: [{
        model: User,
        as: 'Participants',
        where: { id: u2.id }
      }]
    });
    console.log('Existing conversations found:', existing.length);

    // Test create new
    const conversation = await Conversation.create({
      lastMessage: 'Diagnostic message',
      lastMessageAt: new Date()
    });
    console.log('Conversation created:', conversation.id);

    try {
      console.log('Adding participants...');
      await conversation.addParticipants([u1.id, u2.id]);
      console.log('Participants added successfully');
    } catch (err) {
      console.error('FAILED TO ADD PARTICIPANTS:', err);
    }

    // Cleanup
    await conversation.destroy();
    console.log('Cleanup done');

  } catch (err) {
    console.error('DEBUG ERROR:', err);
  } finally {
    process.exit(0);
  }
}

debugChat();
