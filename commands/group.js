const permissions = require('../utils/permissions');
const axios = require('axios');

const groupCommands = {
    add: {
        description: 'Add a member to the group',
        usage: 'add <phone_number>',
        adminOnly: false,
        execute: async (context) => {
            const { args, chatId, isGroup, bot, sock, sender } = context;
            
            if (!isGroup) {
                await bot.sendMessage(chatId, '❌ This command can only be used in groups.');
                return;
            }
            
            // Check if user is group admin
            const isGroupAdmin = await permissions.isGroupAdmin(sender, chatId, sock);
            if (!isGroupAdmin) {
                await bot.sendMessage(chatId, '❌ Only group admins can add members.');
                return;
            }
            
            if (args.length === 0) {
                await bot.sendMessage(chatId, '❌ Please provide a phone number.\nUsage: !add 1234567890');
                return;
            }
            
            const phoneNumber = args[0].replace(/[^\d]/g, '');
            if (phoneNumber.length < 10) {
                await bot.sendMessage(chatId, '❌ Please provide a valid phone number.');
                return;
            }
            
            try {
                const participant = phoneNumber + '@s.whatsapp.net';
                const result = await sock.groupParticipantsUpdate(chatId, [participant], 'add');
                
                if (result[0].status === 'success') {
                    await bot.sendMessage(chatId, `✅ Successfully added ${phoneNumber} to the group.`);
                } else {
                    await bot.sendMessage(chatId, `❌ Failed to add ${phoneNumber}. They might have privacy settings enabled.`);
                }
            } catch (error) {
                await bot.sendMessage(chatId, '❌ Error adding member to group.');
            }
        }
    },
    
    remove: {
        description: 'Remove a member from the group',
        usage: 'remove <@user>',
        aliases: ["kick"],
        adminOnly: false,
        execute: async (context) => {
            const { args, chatId, isGroup, bot, sock, sender, message } = context;
            
            if (!isGroup) {
                await bot.sendMessage(chatId, '❌ This command can only be used in groups.');
                return;
            }
            
            const isGroupAdmin = await permissions.isGroupAdmin(sender, chatId, sock);
            if (!isGroupAdmin) {
                await bot.sendMessage(chatId, '❌ Only group admins can remove members.');
                return;
            }
            
            // Get mentioned users or quoted message author
            let targetUser = null;
            
            if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                targetUser = message.message.extendedTextMessage.contextInfo.participant;
            }
            
            if (!targetUser) {
                await bot.sendMessage(chatId, '❌ Please mention a user or reply to their message.');
                return;
            }
            
            try {
                const result = await sock.groupParticipantsUpdate(chatId, [targetUser], 'remove');
                
                if (result[0].status === 'success') {
                    await bot.sendMessage(chatId, `✅ Successfully removed @${targetUser.split('@')[0]} from the group.`);
                } else {
                    await bot.sendMessage(chatId, `❌ Failed to remove @${targetUser.split('@')[0]}.`);
                }
            } catch (error) {
                await bot.sendMessage(chatId, '❌ Error removing member from group.');
            }
        }
    },

    promote: {
        description: 'Promote a member to admin',
        usage: 'promote <@user>',
        adminOnly: false,
        execute: async (context) => {
            const { chatId, isGroup, bot, sock, sender, message } = context;

            if (!isGroup) {
                await bot.sendMessage(chatId, '❌ This command can only be used in groups.');
                return;
            }

            const isGroupAdmin = await permissions.isGroupAdmin(sender, chatId, sock);
            if (!isGroupAdmin) {
                await bot.sendMessage(chatId, '❌ Only group admins can promote members.');
                return;
            }

            let targetUser = null;

            if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                targetUser = message.message.extendedTextMessage.contextInfo.participant;
            }

            if (!targetUser) {
                await bot.sendMessage(chatId, '❌ Please mention a user or reply to their message.');
                return;
            }

            try {
                await sock.groupParticipantsUpdate(chatId, [targetUser], 'promote');
                await bot.sendMessage(chatId, `✅ Successfully promoted @${targetUser.split('@')[0]} to admin.`, {
                    mentions: [targetUser]
                });
            } catch (error) {
                console.error('Promote error:', error);
                await bot.sendMessage(chatId, `❌ Failed to promote @${targetUser.split('@')[0]}.`, {
                    mentions: [targetUser]
                });
            }
        }
    },

    demote: {
        description: 'Demote an admin to member',
        usage: 'demote <@user>',
        adminOnly: false,
        execute: async (context) => {
            const { chatId, isGroup, bot, sock, sender, message } = context;

            if (!isGroup) {
                await bot.sendMessage(chatId, '❌ This command can only be used in groups.');
                return;
            }

            const isGroupAdmin = await permissions.isGroupAdmin(sender, chatId, sock);
            if (!isGroupAdmin) {
                await bot.sendMessage(chatId, '❌ Only group admins can demote members.');
                return;
            }

            let targetUser = null;

            if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                targetUser = message.message.extendedTextMessage.contextInfo.participant;
            }

            if (!targetUser) {
                await bot.sendMessage(chatId, '❌ Please mention a user or reply to their message.');
                return;
            }

            try {
                await sock.groupParticipantsUpdate(chatId, [targetUser], 'demote');
                await bot.sendMessage(chatId, `✅ Successfully demoted @${targetUser.split('@')[0]} from admin.`, {
                    mentions: [targetUser]
                });
            } catch (error) {
                console.error('Demote error:', error);
                await bot.sendMessage(chatId, `❌ Failed to demote @${targetUser.split('@')[0]}.`, {
                    mentions: [targetUser]
                });
            }
        }
    },

    groupinfo: {
        description: 'Show group information',
        usage: 'groupinfo',
        aliases: ["ginfo"],
        adminOnly: false,
        execute: async (context) => {
            const { chatId, isGroup, bot, sock } = context;

            if (!isGroup) {
                await bot.sendMessage(chatId, '❌ This command can only be used in groups.');
                return;
            }

            try {
                const groupMetadata = await sock.groupMetadata(chatId);
                const participants = groupMetadata.participants;
                const admins = participants.filter(
                    p => p.admin === 'admin' || p.admin === 'superadmin'
                );

                const infoText = `📊 *Group Information*\n\n` +
                    `*Name:* ${groupMetadata.subject}\n` +
                    `*Description:* ${groupMetadata.desc || 'No description'}\n` +
                    `*Created:* ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}\n` +
                    `*Total Members:* ${participants.length}\n` +
                    `*Admins:* ${admins.length}\n` +
                    `*Group ID:* ${chatId}\n\n` +
                    `*Settings:*\n` +
                    `• Messages: ${groupMetadata.announce ? 'Admins Only' : 'All Members'}\n` +
                    `• Edit Group Info: ${groupMetadata.restrict ? 'Admins Only' : 'All Members'}`;

                // Try to fetch group profile picture
                let groupProfilePic = null;
                try {
                    groupProfilePic = await sock.profilePictureUrl(chatId, 'image');
                } catch {
                    console.warn('No group profile picture found.');
                }

                if (groupProfilePic) {
                    const response = await axios.get(groupProfilePic, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(response.data, 'binary');

                    await bot.sendImage(chatId, buffer, infoText);
                } else {
                    await bot.sendMessage(chatId, infoText);
                }

            } catch (error) {
                console.error('❌ Error getting group info:', error);
                await bot.sendMessage(chatId, '❌ Error getting group information.');
            }
        }
    },

    link: {
        description: 'Get group invite link',
        usage: 'link',
        adminOnly: false, // we’ll manually check admin instead
        execute: async (context) => {
            const { chatId, isGroup, bot, sock, sender } = context;

            if (!isGroup) {
                await bot.sendMessage(chatId, '❌ This command can only be used in groups.');
                return;
            }

            // Check if sender is admin
            const isGroupAdmin = await permissions.isGroupAdmin(sender, chatId, sock);
            if (!isGroupAdmin) {
                await bot.sendMessage(chatId, '❌ Only group admins can fetch the group link.');
                return;
            }

            try {
                const inviteCode = await sock.groupInviteCode(chatId);
                const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
                await bot.sendMessage(chatId, `🔗 Group Invite Link:\n${inviteLink}`);
            } catch (error) {
                console.error('Error fetching group link:', error);
                await bot.sendMessage(chatId, '❌ Error fetching group link.');
            }
        }
    },

    close: {
        description: 'Close group (admins only can send messages)',
        usage: 'close',
        adminOnly: false,
        execute: async (context) => {
            const { chatId, isGroup, bot, sock, sender } = context;
            
            if (!isGroup) {
                await bot.sendMessage(chatId, '❌ This command can only be used in groups.');
                return;
            }
            
            const isGroupAdmin = await permissions.isGroupAdmin(sender, chatId, sock);
            if (!isGroupAdmin) {
                await bot.sendMessage(chatId, '❌ Only group admins can close the group.');
                return;
            }
            
            try {
                await sock.groupSettingUpdate(chatId, 'announcement');
                await bot.sendMessage(chatId, '🔒 Group closed. Only admins can send messages now.');
            } catch (error) {
                await bot.sendMessage(chatId, '❌ Error closing group. Ensure bot is admin.');
            }
        }
    },

    open: {
        description: 'Open group (all members can send messages)',
        usage: 'open',
        adminOnly: false,
        execute: async (context) => {
            const { chatId, isGroup, bot, sock, sender } = context;
            
            if (!isGroup) {
                await bot.sendMessage(chatId, '❌ This command can only be used in groups.');
                return;
            }
            
            const isGroupAdmin = await permissions.isGroupAdmin(sender, chatId, sock);
            if (!isGroupAdmin) {
                await bot.sendMessage(chatId, '❌ Only group admins can open the group.');
                return;
            }
            
            try {
                await sock.groupSettingUpdate(chatId, 'not_announcement');
                await bot.sendMessage(chatId, '🔓 Group opened. All members can send messages now.');
            } catch (error) {
                await bot.sendMessage(chatId, '❌ Error opening group.');
            }
        }
    },

    tag: {
        description: 'Tag all group members with a custom message or quoted message',
        usage: 'tag <message> (or reply to a message with !tag)',
        adminOnly: false,
        execute: async (context) => {
            const { chatId, isGroup, bot, sock, args, sender, message } = context;

            if (!isGroup) {
                await bot.sendMessage(chatId, '❌ This command can only be used in groups.');
                return;
            }

            // Check if sender is admin
            const isGroupAdmin = await permissions.isGroupAdmin(sender, chatId, sock);
            if (!isGroupAdmin) {
                await bot.sendMessage(chatId, '❌ Only group admins can use this command.');
                return;
            }

            try {
                const groupMetadata = await sock.groupMetadata(chatId);
                const participants = groupMetadata.participants.map(p => p.id);

                // Priority: args message > quoted message > fallback
                let tagMessage = null;

                if (args.length > 0) {
                    // Text after !tag
                    tagMessage = args.join(' ');
                } else {
                    // Check for quoted message
                    const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                    if (quotedMessage) {
                        if (quotedMessage.conversation) {
                            tagMessage = quotedMessage.conversation;
                        } else if (quotedMessage.extendedTextMessage?.text) {
                            tagMessage = quotedMessage.extendedTextMessage.text;
                        } else {
                            tagMessage = '📢 Attention everyone!';
                        }
                    } else {
                        tagMessage = '📢 Attention everyone!';
                    }
                }

                await sock.sendMessage(chatId, {
                    text: tagMessage,
                    mentions: participants
                });

            } catch (error) {
                console.error('❌ Error tagging members:', error);
                await bot.sendMessage(chatId, '❌ Error tagging members.');
            }
        }
    },

    tagall: {
        description: 'Tag all group members with their names',
        usage: 'tagall <message>',
        adminOnly: false,
        execute: async (context) => {
            const { args, chatId, isGroup, bot, sock, sender } = context;
            
            if (!isGroup) {
                await bot.sendMessage(chatId, '❌ This command can only be used in groups.');
                return;
            }
            
            const isGroupAdmin = await permissions.isGroupAdmin(sender, chatId, sock);
            if (!isGroupAdmin) {
                await bot.sendMessage(chatId, '❌ Only group admins can tag all members.');
                return;
            }
            
            try {
                const groupMetadata = await sock.groupMetadata(chatId);
                const participants = groupMetadata.participants;
                
                let tagText = args.length > 0 ? args.join(' ') + '\n\n' : '📢 *Group Mention*\n\n';
                const mentions = [];
                
                participants.forEach((participant, index) => {
                    const number = participant.id.split('@')[0];
                    tagText += `${index + 1}. @${number}\n`;
                    mentions.push(participant.id);
                });
                
                await sock.sendMessage(chatId, {
                    text: tagText,
                    mentions: mentions
                });
            } catch (error) {
                await bot.sendMessage(chatId, '❌ Error tagging all members.');
            }
        }
    },

    admins: {
        description: 'Tag group admins',
        usage: 'admins',
        adminOnly: false,
        execute: async (context) => {
            const { chatId, isGroup, bot, sock } = context;
            
            if (!isGroup) {
                await bot.sendMessage(chatId, '❌ This command can only be used in groups.');
                return;
            }
            
            try {
                const groupMetadata = await sock.groupMetadata(chatId);
                const admins = groupMetadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
                
                if (admins.length === 0) {
                    await bot.sendMessage(chatId, '❌ No admins found in this group.');
                    return;
                }
                
                let adminText = '👥 *Group Admins*\n\n';
                const mentions = [];
                
                admins.forEach((admin, index) => {
                    const number = admin.id.split('@')[0];
                    adminText += `${index + 1}. @${number}\n`;
                    mentions.push(admin.id);
                });
                
                await sock.sendMessage(chatId, {
                    text: adminText,
                    mentions: mentions
                });
            } catch (error) {
                await bot.sendMessage(chatId, '❌ Error getting group admins.');
            }
        }
    },

    resetlink: {
        description: 'Reset group invite link',
        usage: 'resetlink',
        adminOnly: false,
        execute: async (context) => {
            const { chatId, isGroup, bot, sock, sender } = context;
            
            if (!isGroup) {
                await bot.sendMessage(chatId, '❌ This command can only be used in groups.');
                return;
            }
            
            const isGroupAdmin = await permissions.isGroupAdmin(sender, chatId, sock);
            if (!isGroupAdmin) {
                await bot.sendMessage(chatId, '❌ Only group admins can reset the group link.');
                return;
            }
            
            try {
                await sock.groupRevokeInvite(chatId);
                await bot.sendMessage(chatId, '🔗 Group invite link has been reset. Previous links are no longer valid.');
            } catch (error) {
                await bot.sendMessage(chatId, '❌ Error resetting group link.');
            }
        }
    }
};

module.exports = groupCommands;
