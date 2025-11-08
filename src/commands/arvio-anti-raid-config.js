import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { readConfig, writeConfig, withDefaults } from '../utils/store.js';
import { isOwnerOrManager } from '../utils/perm.js';
import { colors } from '../utils/colors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('anti-raid-config')
    .setDescription('Tune Anti-Raid thresholds.')
    .addIntegerOption(o => o.setName('spam_window_sec').setDescription('Count messages within N seconds').setMinValue(3).setMaxValue(60))
    .addIntegerOption(o => o.setName('spam_max_msgs').setDescription('Max messages in window').setMinValue(3).setMaxValue(30))
    .addIntegerOption(o => o.setName('spam_timeout_mins').setDescription('Timeout minutes when tripped').setMinValue(1).setMaxValue(40320))
    .addIntegerOption(o => o.setName('join_window_sec').setDescription('Count joins within N seconds').setMinValue(10).setMaxValue(300))
    .addIntegerOption(o => o.setName('join_max').setDescription('Max joins in window').setMinValue(3).setMaxValue(100))
    .addIntegerOption(o => o.setName('new_acct_min_hours').setDescription('Block very new accounts (0 to disable)').setMinValue(0).setMaxValue(720))
    .addBooleanOption(o => o.setName('enabled').setDescription('Anti-Raid master switch')),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use in a server.', ephemeral: true });
    if (!isOwnerOrManager(interaction.member)) return interaction.reply({ content: '<:v7:1435698081399308420> Owner/managers only.', ephemeral: true });

    const raw = readConfig(interaction.guildId);
    const cfg = withDefaults(raw);

    const sw = interaction.options.getInteger('spam_window_sec');
    const sm = interaction.options.getInteger('spam_max_msgs');
    const st = interaction.options.getInteger('spam_timeout_mins');
    const jw = interaction.options.getInteger('join_window_sec');
    const jm = interaction.options.getInteger('join_max');
    const nh = interaction.options.getInteger('new_acct_min_hours');
    const en = interaction.options.getBoolean('enabled');

    if (sw !== null) cfg.antiraid.spam.windowSec = sw;
    if (sm !== null) cfg.antiraid.spam.maxMsgs = sm;
    if (st !== null) cfg.antiraid.spam.timeoutMinutes = st;
    if (jw !== null) cfg.antiraid.joins.windowSec = jw;
    if (jm !== null) cfg.antiraid.joins.maxJoins = jm;
    if (nh !== null) cfg.antiraid.newAccountMinHours = nh;
    if (en !== null) cfg.antiraid.enabled = en;

    writeConfig(interaction.guildId, cfg);

    const e = new EmbedBuilder()
      .setColor(colors.success)
      .setTitle('<:v6:1435697974431977522> Anti-Raid Updated')
      .addFields(
        { name: 'Spam', value: `window **${cfg.antiraid.spam.windowSec}s**, max **${cfg.antiraid.spam.maxMsgs}**, timeout **${cfg.antiraid.spam.timeoutMinutes}m**` },
        { name: 'Joins', value: `window **${cfg.antiraid.joins.windowSec}s**, max **${cfg.antiraid.joins.maxJoins}**` },
        { name: 'New Account Gate', value: `min age **${cfg.antiraid.newAccountMinHours}h**` },
        { name: 'Enabled', value: String(cfg.antiraid.enabled) }
      );
    return interaction.reply({ embeds: [e], ephemeral: true });
  }
};
