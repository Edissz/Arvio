export default {
  giveawayChannelId: "1455965081987711204",
  endAtIso: "2026-01-01T00:00:00+01:00",
  spinsPerUser: 2,

  rewards: {
    participation: {
      label: "🎆 NY 2026 Participant Role",
      weight: 50,
      type: "role",
      roleId: process.env.NY2026_PARTICIPATION_ROLE_ID || "",
      roleNameFallback: "🎆 NY 2026 Participant",
    },
    discount30: {
      label: "🏷️ 30% Discount Voucher",
      weight: 25,
      type: "voucher",
    },
    template: {
      label: "🎁 Free Template Voucher",
      weight: 20,
      type: "voucher",
    },
    pro: {
      label: "🪄 MagicUI Pro (1x) Voucher",
      weight: 5,
      type: "voucher",
    },
  },

  buttonCustomId: "ny2026:spin",
  brandColor: 0x1b68cf,
  voucherPrefix: "NY26",
}
