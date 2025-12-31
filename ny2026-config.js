export default {
  giveawayChannelId: "1455965081987711204",

  endAtIso: "2026-01-01T00:00:00+01:00",

  spinsPerUser: 1,

  rewards: {
    participation: {
      label: "NY 2026 Participation Role",
      weight: 50,
      type: "role",
      roleId: process.env.NY2026_PARTICIPATION_ROLE_ID || "",
      roleNameFallback: "NY 2026 Participant",
    },
    discount30: {
      label: "30% Discount Voucher",
      weight: 35,
      type: "voucher",
    },
    template: {
      label: "Free Template Voucher",
      weight: 10,
      type: "voucher",
    },
    pro: {
      label: "MagicUI Pro (1x) Voucher",
      weight: 5,
      type: "voucher",
    },
  },

  buttonCustomId: "ny2026:spin",

  brandColor: 0xffffff,

  voucherPrefix: "NY26",

  // main giveaway banner
  bannerImageUrl:
    "https://cdn.discordapp.com/attachments/1441524770083573770/1455979693256736899/Black_Yellow_White_Modern_Black_Friday_Sale_Banner_2.png?ex=6956b241&is=695560c1&hm=af48e8fc2a1a1b5acff3067990178517b850fcc4bc020d95026f1ae78f9745d0",

  // ✅ new voucher ticket image (only on voucher wins)
  voucherImageUrl:
    "https://cdn.discordapp.com/attachments/1224427755702194277/1455986106725040293/Black_and_White_Minimalist_Fashion_Special_Gift_Voucher_Ticket_1.png?ex=6956b83a&is=695566ba&hm=71880fc36ca9b8a96f15f1ee5d958d69a2f6d9d81d453e937fd2b45987d7ac85",

  claimUrl: "https://discord.com/channels/1151315619246002176/1405208521871724605",
}
