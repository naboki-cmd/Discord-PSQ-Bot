// =========================
// IMPORTY
// =========================
const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  Events,
  MessageFlags
} = require('discord.js');
const http = require('http');

// =========================
// ENV
// =========================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// =========================
// MINI HTTP (Render Free)
// =========================
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
}).listen(PORT, () => {
  console.log(`HTTP keepalive on port ${PORT}`);
});

// =========================
// KONFIG
// =========================
const ALLOWED_GUILDS = [
  '1193241714127806494',
  '874238114565091358'
];

// TICKETY
const VERIFIED_ROLE_ID = '1313660797179662398';
const MOD_ROLES = [
  '1312912421492494437',
  '1312699108036706406',
  '1312912158786326671'
];

// SANKTUARIUM
const SANKTUARIUM_ROLE_ID = '1377304751963770993';
const SANKTUARIUM_CHANNEL_ID = '1377292828287176765';

// ABYSSAL
const ABYSSAL_ROLE_ID = '1312913832099713065';
const ABYSSAL_CHANNEL_ID = '1313584096080826398';

// AUTO CLOSE
const PRIVATE_THREAD_AUTO_CLOSE = 3 * 60 * 60 * 1000;

// =========================
// KLIENT
// =========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// =========================
// READY
// =========================
client.once(Events.ClientReady, () => {
  console.log(`✔ Zalogowano jako ${client.user.tag}`);
});

// =========================
// SLASH COMMANDS
// =========================
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Ping'),
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Panel ticketów')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('close')
    .setDescription('Zamyka ticket')
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    for (const guildId of ALLOWED_GUILDS) {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, guildId),
        { body: commands }
      );
    }
    console.log('✔ Slash commands registered');
  } catch (err) {
    console.error('❌ Slash command error:', err);
  }
})();

// =========================
// PANEL TICKETÓW
// =========================
async function sendTicketPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🎫 System ticketów')
    .setDescription('Kliknij przycisk, aby utworzyć ticket.')
    .setColor(0x5865F2);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('🎫 Stwórz ticket')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// =========================
// MESSAGE CREATE
// =========================
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (!ALLOWED_GUILDS.includes(message.guildId)) return;

  // SANKTUARIUM
  if (
    message.channel.id === SANKTUARIUM_CHANNEL_ID &&
    message.content.includes(`<@&${SANKTUARIUM_ROLE_ID}>`)
  ) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🕯 Sanktuarium')
          .setDescription('Kliknij **Dołącz**, aby utworzyć prywatny wątek.')
          .setColor(0x2f3136)
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`join_sanktuarium_${message.author.id}`)
            .setLabel('➕ Dołącz')
            .setStyle(ButtonStyle.Primary)
        )
      ]
    });
  }

  // ABYSSAL
  if (
    message.channel.id === ABYSSAL_CHANNEL_ID &&
    message.content.includes(`<@&${ABYSSAL_ROLE_ID}>`)
  ) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🌲 Abyssal Dark Forest')
          .setDescription('Kliknij **Dołącz**, aby utworzyć prywatny wątek.')
          .setColor(0x0b0f0d)
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`join_abyssal_${message.author.id}`)
            .setLabel('➕ Dołącz')
            .setStyle(ButtonStyle.Secondary)
        )
      ]
    });
  }
});

// =========================
// INTERACTIONS
// =========================
client.on(Events.InteractionCreate, async interaction => {
  if (!ALLOWED_GUILDS.includes(interaction.guildId)) return;

  // SLASH
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'ping') {
      return interaction.reply('Pong');
    }

    if (interaction.commandName === 'panel') {
      await sendTicketPanel(interaction.channel);
      return interaction.reply({
        content: '✅ Panel wysłany',
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.commandName === 'close') {
      if (!interaction.channel.isThread()) {
        return interaction.reply({
          content: '❌ To nie ticket',
          flags: MessageFlags.Ephemeral
        });
      }

      const member = interaction.member;
      const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
      const isMod = member.permissions.has(PermissionFlagsBits.ManageGuild);

      if (!isAdmin && !isMod) {
        return interaction.reply({
          content: '❌ Brak uprawnień',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.reply('🔒 Zamykam ticket...');
      setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }
  }

  // BUTTONS
  if (!interaction.isButton()) return;

  // CREATE TICKET
  if (interaction.customId === 'create_ticket') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const member = interaction.member;
    const user = interaction.user;

    const isVerified = member.roles.cache.has(VERIFIED_ROLE_ID);
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const isMod = member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!isVerified && !isAdmin && !isMod) {
      return interaction.editReply({
        content: '❌ Musisz być zweryfikowany, aby utworzyć ticket.'
      });
    }

    const channel = interaction.channel;
    const name = user.username.toLowerCase().replace(/[^a-z0-9]/gi, '');

    const thread = await channel.threads.create({
      name: `${name}-ticket`,
      autoArchiveDuration: 1440
    });

    await thread.members.add(client.user.id);
    await thread.members.add(user.id);

    const ping = await thread.send(
      MOD_ROLES.map(id => `<@&${id}>`).join(' ')
    );
    setTimeout(() => ping.delete().catch(() => {}), 5000);

    await thread.send(`🎫 Ticket dla ${user}`);
    return interaction.editReply({ content: `✅ ${thread}` });
  }

  // JOIN PRIVATE
  if (
    interaction.customId.startsWith('join_sanktuarium_') ||
    interaction.customId.startsWith('join_abyssal_')
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await interaction.message.delete().catch(() => {});

    const authorId = interaction.customId.split('_').pop();
    const joiner = interaction.user;

    const thread = await interaction.channel.threads.create({
      name: `private-${joiner.username.toLowerCase()}`,
      autoArchiveDuration: 1440,
      type: 12
    });

    await thread.members.add(client.user.id);
    await thread.members.add(authorId);
    await thread.members.add(joiner.id);

    await thread.send({
      content: `<@${authorId}> <@${joiner.id}>`,
      components: [
        new ActionRowBuilder().add
