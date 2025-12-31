export default {
  giveawayChannelId: "1455965081987711204",

  // Ends right as 2026 starts (CET / Belgrade)
  endAtIso: "2026-01-01T00:00:00+01:00",

  // ✅ Change: 1 spin only
  spinsPerUser: 1,

  // ✅ Change: template 10%, discount 35%
  // Total must be 100
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

  // ✅ White embed bar
  brandColor: 0xffffff,

  voucherPrefix: "NY26",

  // ✅ Banner image + claim link
  bannerImageUrl:
    "https://cdn.discordapp.com/attachments/1441524770083573770/1455979693256736899/Black_Yellow_White_Modern_Black_Friday_Sale_Banner_2.png?ex=6956b241&is=695560c1&hm=af48e8fc2a1a1b5acff3067990178517b850fcc4bc020d95026f1ae78f9745d0",
  claimUrl: "https://discord.com/channels/1151315619246002176/1405208521871724605",
}
