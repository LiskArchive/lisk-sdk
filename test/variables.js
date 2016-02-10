"use strict";

// Requires and node configuration
var _ = require("lodash"),
    config = require("./config.json"),
    expect = require("chai").expect,
    chai = require("chai"),
    supertest = require("supertest"),
    baseUrl = "http://" + config.address + ":" + config.port,
    api = supertest(baseUrl + "/api"),
    peer = supertest(baseUrl + "/peer"),
    async = require("async"),
    request = require("request");

var normalizer = 100000000; // Use this to convert LISK amount to normal value
var blockTime = 10000; // Block time in miliseconds
var blockTimePlus = 12000; // Block time + 2 seconds in miliseconds
var version = "0.1.0" // Node version

// Holds Fee amounts for different transaction types
var Fees = {
  voteFee : 100000000,
  usernameFee : 10000000000,
  followFee : 100000000,
  transactionFee : 10000000,
  secondPasswordFee : 10000000000,
  delegateRegistrationFee : 10000000000,
  multisignatureRegistrationFee : 500000000,
  dappAddFee : 50000000000
};

var DappAscii = {
  icon: "H4sIAAAJbogC_-xdW28dt3Z-ln9FoOdgg_dL3orkFCcoTmLYTftQ54EzQzaCbcnVJW1a5L-XW_Ksb3kWpSa1bJ0Nb8GQxnPhcEgO18dvfWvN6cuz8tXLX8plXb76x7M39fTZqdrp02f_9uzkf56dnJz-UN7W02--Or159-aiLLt35_9--vV-_7e_1Pn11c3bfqyfenKivj7Y3_3Xz7fP9JfLcnVzWV_Ov9S7h7571Odnda5XL-p_3Jz1Vur79e3uH99dn70tb17U-eLXevnb3Vn96G2pp_98cV3ebPbRf29bbN-8-xMvy_lVq5fvi47Of3134B_m67Nf99W4vryp7_e9qO_K2eVZ74RvvmrlzdW6_9uL8-vLMl_33XfFnpzuO_Pl2X_XDwq92_23evn6TX1xcXG91qX_GOO-pk21bupImz7guF43c6Sdia7JtImrs6XDZt2iWvV9uFrTmZ7ONNipE-0NaXTcoyiX5alaGVl5belMSzsdHpiOGkePbnCNj3jgu42f1_b-17Pz5eI_X16Xy31j95ajx39_6C_ny-0Bp9a2On1efru4uT3dGRN9UgrH_qW8OVueX15ctB9vrt_dXF-xLnzf9Xdn3ex73liTTNSsgH7wp_M3F_Prv5arX_ZjPAU9-9kpo3TwzfiqplxrSkvL2VjtyuRtNSbM1k6qzK7ppUxTVL3JsmqxLS3U5tQ0NWVO39_j900j_O3s6qo-aq3VR_6kXCe1hJJKyPfV-hPecb3Fi_rr2dXZxfkPN2-nermfKG4P_L55rb__Du2l4zrU9fr6GLWOxLjusuuGXscrvYBpfc97f69bbh2UYT3LaDrNr73QR8G6RafR2-TXG6W1MoZeIKPXIta_moqKdB-adeh1omrRi6wN7aLrYqDHoOJ1esb68vSvF1fX3z_fd6M2fufdTju36_X7Judk3vfG6e1L-v35Uv9rnbH3NuF82e66ncbF1Hq3W14-X_7WDcXF-T_V39CJ1GiJKky9mqhbqe8MTRrGWdFcRlE_-vVoXhssrM1EpVqzbV3M94ZakGpITUr9GqiAKMePHJNGYfzQ42J8Uk2pNpZumd0HvbjFHBhOX9zfu3Z5RnPF3xuYgJE3MLIhAyIYmH6cSoMNLzw98kmMAxNP81UfNgF2H5bbASM4oBrNkIeXcIRu7oAaqEiUaIEFjLzEODe6dQoDAAHElFEz-5hQQvfTk_L7Hxc_AlFoHZx3XtuUUrcMD5joJbRau42ZrA96WrQvyU21Y42ioo5LtUmHNtsSfE5xSq2aqTRj3Zzt3CubJ5ddyEtegloeCVj88cp_ufjCKLIwND61gk2iKZwGMr3LeOs1oQ0yEYSrDb3bdmtsdMxbnEB7JPbQhBOsE8YtR2FqMBdYYR1ha3WQT0PmrQ9L4KN7EIbf5Z3Wu5SeClwo0X_UiIQdDWsyIANqzyhABk1mtAzELKwJCABJJOolIBYMFEuXqi1gzYCnwAEYfvQAVMVgBCilTiI8hFUfByHxCC8OEl5ozkUAVMDgamZwaQycsOOagQVp9emKoEGEMLIAd9dgBoAQtAEqUbDnKCwpYAAQKEAiAMUfIAvUAIYroYYKUMeC49ASKjGu49NCjMfAGM49ZKenlBaT5hrq7BbXfHVTM0stJYc5xj5OlpBsRxEpzsWYGHLJfgmmzjpNMWXnTY2u73YxfxKQ8XDtv2AWA7YAczS9lMAK61ClRTHZNML4mkyBUetgJ_sCmxAEnUHwg5k7sy09CdaEeFI8g5dUCb2sUZo_QAy6nwVpQsWr-ADCMB1kKPtUEAP0DWhjTItZCWToJTI0WvYbzVGAb4m2QCgEMWKMgA8w8wRFaNoFns2CoQJW0ls6inpLK4wBGkR6MECOAONAAQb4CcvoCS3pCc2cEA6kBsx6DANfSmDwhFl1BhuMdKGwnQwVGICNxEoF98C8KMYOaAgdUW14N0BDcjSBi_QALWn2_OxRH9kjYoO-_VFBxY_yjGSVlYn9x-QHrbSdordztrYPHRU63LCTqsrrEJe-O3vVTCoqdsTRpmBsnkzLaVKznqyvtuTJZj03bbxK6fE8JH-09l8uxoD1UVipwnRoaZvsOpRpiqAy6H3BWwzqUBM6AN0OAyZsPFsvM66bVs5GrJyxRqfZxks8wtxAWgAMMruaDrImMP4eqBHdLppdxzW7XtRToQ3iKlBhelQNuws-AobeewHIMAsyZOC2vg0iMtALVBbxSMAYBrUIotOAUGEXNI0UWqFR74EOM1uCDN3OaBVqi2iPeOMw8QYDFHBeMD8Hc5JoMAaY9QN8F2EgfzCsUJ0GqgcGXZjrBtwITRrAxycBSgk1Yi7gT0Ht8UL2tw9ODyVLgrOZzcu8dhq145oPqx8VbwQd_Yfm6f-JN3x_d6msB7UN1aTaTAcMyS0dc6iWS1aTnuZlciZkV71pdl6SmpurpRod-o5qrM5tifPssvPzpPrFi54fC2_88dp_uXjDb33v2mSJO2DeseaH9SBwAQ5bjYAKPDNJ8ihwV4A4x9oVcgmIPeD2H_DwRouFN7wyCq6RKOtJdceKG8bThPs0Gi7vdNr131k9GcMBP0eKQv_CGtEG6a_QQHVACEkwUdpLwEI9Br8GY5XQxrQmA2cFx5qGGAduD4xFwUxRfZ3ewh_wKYQzfRauIKOOwOMwhRrgNBjRAM2GHdh9wAqYXWASJ0WTTNPAGAju42AOFVhyMyoU-CHB_IP4wONwnYUZSFM1wxfgYBjbwzwzoEXYTZlfyR865Ag5hH6qS6U2X0z1OTfllhps6zvTHMrszWRj6KtN14rRk02tTHHubbv4qdo51H63yVftjpDjM7pRYJssVrUSMBh6j-kFYdy8lt51mCYBKhgggS3H-WReDNaqWF57qSjxwnyxBToKIwcQ2bgsltIANGydzbQJ9-GNlHbGmZ3Pu_BkklCamZwTncaoDSU9TAzvEWbIknvAegyGH_gsw2dBt98qM4Ew1w1yaWMxxwYi1YZ5f7b-PAwSPI4WDQDZq9FHqHGgHAdTPSCAhCtF2eIfxlu5QeQHd1RANAoEA2qARaWgSJAtZhDDAZkIixqBxwakCQQb7BngzoH0IjIZCYuyMQN1KSYzxuyyuXHvZXpU0YZV6XHghjY-RhT2oMWO2TuVnbPRxVaKC87mtEwqpVJKqDbb1gFIRxstdvSh2zTX2c2pTaHExc3O9Hm1aJ28nepjyTb-RPW_YJ-KFzyGEA3SRghizc8iNIQBwPI1ZGH2QZEoyZrAZBph9hBfAO8BasGoiiSpEgV5aBByUivsJJyq_d2_D2vEtOvv3M6GXdJPhTWA5ei5kuQTwApIi854H3b-dkhgemUGPIleg7YOIn7Q1HCeQLkjOw2KHzVQFsGbQ9gnOIl4UDWg02MIyoHCDcVMJi3Vox_pNX0eGGUa64ho-yBO1Y5sOjP_DKKMEAx8Hrg786OA_GAKTyZghXFifhasBHjYjWdSDz26ip8LCQo29SNrOJ6A4FjaEk0serGzdy7O1U2zUzr2v15PrVq3ZOWTDzWoWS1KlbL3vZRgXYph7vN0CaUt3oQlHQmOz6kTdcJc0K4o-Gu81EyXmISn3TDNxLoPjD69zizGQC66aUmeg4hVgbBAg6f3UtcB9kZaO7hYsDZ3cisxQHYf5FB5163iLuhdN-BPFvKKR5QxGeg2KzQskIKCeLIyzgjuKkke6YGYQ4QA0ZrRiWgZUGpWcCis8KRl1BL6nx21An45NvqOgOMwAYcZ5sIY2WkW6cHyXugBHQB3BxQcDAWkAW3AHBdhoPTgobeeCTaZY2O4M0sxB5OIMpaGKTxA8zAIxaSpmm0yQujQwcakWrQp2KU4XZdS3GLLMnV7OFXTkYadYq-VX_qMEFNurXlXSlqSTqlm7WuYQ805mjnmEo9g4_OBDVDrg2BBpcRqFREJcO7TAhbrUGIzCClQ-Vl4TQAYzEBZEJKUMzohyqB6ua3TB1gCNEYS0kc4T9w2T8WWfmdK0bzzHWAku-uP8FQgIyZpd2kfAl3p-aKXjQ2Ki5qNdQr1tIxLsbKVMVZYuJLbRi0zL0qUuTnkUPRZyofpRgC5TBpEop51VzxGphwqykBKrZH_AJASzCrTaWgVB34MrUdSDNhklqODRbFm5m5hmCENimWaVXAxDBOwWjHWwQzYDrAScSQfxYOokTpVsyY5dJSRTc1ubjXbOIVsVWoxxtRMUi14b2P2yceQVLFO7VNvNDO5HHNItszKl-xLByQt-byoI8r4jCgDtLffiiwgNGLpt-AYD3ag61TC-cByWWjhsWdxA7BuSrIVyM8VBSqi9SszkAOJZJSECrQBSF5GT2q3K38d7wMbye10TrvU_8UnU4ha6Yli2gfilaRgAwlQBrIOCS-k3XdJ5iNBWagEBCRsOAUJb4xI38V8LYjSBREThPSGuYEgBcEdXDrijcPEG0h2wWJAhoJO4AUmyWAUBMucmQa8AgQaPMEG8mcYrvnwA48Ly6fFcmmw_BujQN2YB3u5GyeNImnZZdynM4gPZlnArDv0SNiUO5yIIbSw1LK4OYdpUTYVl3WYpujU0hbbyrQ4NXntZq1qCUU13c_S2dWY4q161KUlHCNhP2fOUCUSLEBPkWUQY5ApuhDs6oRBIxae3hAW97C16iyDpZURMyJ_lHTCJBkzi7fMDGwTUA2MJJ6fpVG9NyBFpV2ftHb9NvvMoU-XdcNtM2yYQcYR0LYI-qBGt4P8oYAEQXBBetDESJySpXODoCAExjKNK2FD6hBIcvJWGOQFnWVFxzK4egQaBwk0GEcBeMEydCPCFbkleNpuK9QWCDvBKOY5xZlARMdB0CwXrKo0UHuwJBiMWWBuoCEHwRAHk1iw-seRHgSQKQ4TqiIYN7hDZzacztEbY0qtkzFLylMypTTfrNPLbGffgq1TWJbY1zBaV9valKNpk48mRd_0lGLoqGCaizkyG58RZtAgHqSzoo0kMnizsEakFyVXB4u1RGJwuf4E7-2k_tRKIccgkQIgjkxnDfsEbQf4GFYapChuG0vJMpHehzSi3yWzy2nXX4Enc6IY8YDgBaCzAA7EkzKXVZKYC5pRJ3OoMTkv7sa8OGoLMSHvIIoCGdZo5mVJQcwWWtJEmwZaDpk-DOMD2VP1EW8cKN5gybJYMtBkhvknwsDTwd0fTJc5zEkxcG9wr8To4yYsQ5cf5i3NbK8SgSgIsGOfXhlpTnMaxN6ykFnUePi5lPdB_I-FNmzONrp892OV-RhaQ_lIpVmrHrLZZcom2iWnGp1trqRkcnFL89X6ZVlCrtmH1v-1XHSuocQ-me3VorXbnanmZrVavJvasvhHIzb-RP2_5HTlTixG8T0MFiKCwAKzDSmBMstvoUmWWcvhkEGYCiIwo8yCQbKPQRik_GgKJQGEjYFzQG-DZpNMd2nFUj-FBxKJprDT6emybESRX5V6DzIUJTN760Fvw9VCEzawTBK2m7XP1ldjZdwK5lvmajGDj5agc6W81YrMqMgFx3Cl2wZfH0HGgXpPWHZxJ3Nq8A-cMdphkI1C56EuA36W0WdHIDT-MMWGl7afsR4MEAzknSgH8g07glJQ1vPc6W6EX3jxLJ07y2n2uGKNFLN5HE4jhpA9FfZwyKtNfbEzz6mjQWtSc00V35yeSnBz9rZOvtWp9v97PZtFVRuLdW2e1WJiVLObonJRlblG9VgQ409U_0tmNZxU1CEBNBaKyDKaB_GSAyEpwmK9FEjQOxNGX9IIIlKRRcoM7BO7FjJRfNsrCAM18BN4mQsExSJWItyrEFW7bhx3ep9Q9OlSl9swSInmhGIiB5EUha3_sU8NHGQhCA8X_DSsn-Akw2drtPiUGxsm6FjUOAgtCYt4DiLBGEJngFic4HsyS5N7hB6HCT3S0E_hByIM_s0xPcgIaiRr4AffbOM5xZMdpALnToow8LIAHPhBklH2jVf2rdo0yI6u4yi2lXtzhgG9jHthhI_91Mm9HsWf8rDxTjXOc7XKTx36LFO_qoXZT1m3XJJpk9Ut7RNwmDqnMsep-hxLiMs--WhHIs5PsdWclVd2-iQOlSP2uAd7IJs0XBc0OINMx7nlFewgJ2UQMkJYdqSBYEmiZE5zsClZAoboRcCmG3xUjSQAYZCgI2wXxQxmhUGAp70Hc2S9M7rjDuX7X_90sa9O6HARkxME9QOKiWZXUrwRRxG3LAG0clDCMUGxlIeAaACgG4SbaBlAY0VgEPANmRhkL2fiDvlFX5A79igS_b-xBn2t_qfbL_I_L5fl7dWKE27hwPn7T_Z_-82rVz9d1curV6-u6lSurs86Mrl-9eq7evX6-uLdq1ebb_qfnH53c1n2g7dfHdb5-PSHs_n1WqS4gj5pr_dmslfu92c__28AAAD__5HElXFTgAAA",
  app: "H4sIAAAJbogC_-xdXXMlRXJ91vwKQs_Ejcr6Lt4csI4lHMsSYOwHDw_V3dVGwSCN9YENDv6760rTeZKbJXkBzQjN3NmNmaa7b3V1feWpkyezT78-qx99_V29bMtH_3z2qp2-ODU7On3xHy9O_vfFycnpF_WHdvrJR6ftfL786fX12e7ns9enH--vfPpdm7-_uvmhX-03n5yYj5_t3_2vb2_f6S-X9ermsn09f9fuXvvuVb88a3O7-qr9181Zb6d-nm5P_723xw_11VdtvvixXf50d1e_elvq6b9eXNdXB-f4P29bbN_A-xsv6_nV2i7vinYmmGg_vrv0T_P12Y_7ilxf3rQ3575qr-vZ5dn5f_bTa311tZ3_9OL8-rLO1_30XcEnp_sO_frs53ZQ7N2Fv7XL71-1ry4urrf69D-U45t7Tkrejsx2YN1WwgkR32j5yPNlG_hHFBIfWs-HXJkTH7Yj57ajzDdaj0NUJPDJyEcFRxFP5MNA_BN-s1z4RoO6Gy7IoeqEamT8CIeJUON4d_Tt1tz_fna-XPz319f1ct_W1hLZX1_6y_lye8Gb7RVPv6w_Xdzsb_fWBZ_N_n-4-m_11dny5eXFxfr3m-vXN9dXog_f9P7dXTf7zvcmGVuSCaKIfvmb81cX8_d_rVff7Yd6jjSH2RtrKIbVhmam0lrOy1qKdeTrFFyzNs7OTabOfqWlTlMy5Eoxa1qXNbbVm2lajT1984xfDhrib2dXV-2R623-4J9c2mSWWHON5b56v8Unbo_4qv14dnV2cf7FzQ9Tu9yvGLcXfjmY3Z9_hhbz2-gknm1hm0vbwLR-G-IUt9nl-GLYxiHRVgLxdORxbt02iQIXlrdn--0u4gWD3DYXLBX9qBT4F_xQxwXjPl4s-O2IlwUy2yNi5FfgMhKfi9xE-YXo0dO_Xlxdf_7lvjPJhl3wO_J-1yfuJ6Vk-6ZPTm8n7OfnS_ufbQHfm4jz5fDU7ao-WGfvLugC7izpxfm_tJ_QmVvj8ZJEZesvy8sMFhz0Ia-KlpewtDUTGsJsR7Goa4Ubabu2_d5xe_PS3tcoHhYYZFZ1aUQ_8g_IcQ_xG_FKbonfbfvXqFKtdb_qx0MQAmP1wf171y4veM34E6KLEmBj2dwWnIM19lEbawtrXNjYwuxirp94FOSAQxwstNOQQvycYGxIApGAe_FUPzpJKCs4HAJX2AFUCQNEhRbDLO3z4jHxRb87-278uwkoKQT7-2GGNS7kGPoSnqJPPj9ktZe4ttaBxuRCpGmhULOfWgcg1SRKS3OZ4jq7GkPJacprs1NdrfNzcXOvcZl88bEsZYlmeSS08Vuq_-GCDuLJxWPTBlgqo8wEzyse9JhUMCps_tiGsa2AJeEyiW2FJa-sCxAMBQVhiA0gKss161CbLRTA1TavE0BKUGbYcH3tdjHdAznCruyIdjk_HdqwAFyZq8uoDY3AgMCqduHNGrcPtodY9YDn0NyUAVm2R_Goiro_ue_Qi9zFZLen80q6FYBRhjpwkeEQ8mD5FdUjc0QbfwBtxA7TNxT_7tGG9bDCbkBRYJsPdPsr082jH6uS2GWcgNfwpM9RyAPTbe2AcCCD6zwvAaAlciGQD7yNAj8DqJEFVRIGHAU5gVuKZmIEaklvHW08Etxw5gGDPeW82Dy32Ga_-DU0P612abWWOKfUJ_8Ss-uAIqe52l5gqSUs0baZ8pRy8cG25Ptpn8rbwhsP1v_DBRzCdPOmkW0zL-xEbN-NphwMSBCUQcqQObVHdopcYBNSsFH3h7aL-C5ctDx1M9eVyxcmivlOsDoZF4NiAohBTngAb9gOOYx7OsABFMWQjNfCCOJmO8VoIOgOZipD2On0AFUEEMicNSgJ4CDeU1refII94h0Z91gEwtGAmEhDY3fYmSDT2Gp4f8Qbz5bdANTFDD_Bpp7cCGTAy4JNBQB4RyZ8J9CIeBAWGmmyCdcTzloBfdLAD4Nf8T5LwCX4ZgjYAocxaJ-JIGwEuQFGptvZAc_S2-mR3SexJLv_00GPKc7-ETdKb0_Th0PwyeTo7QMG200puLk4R8mb2LGHm0wzgWJa-ukSzGpzNanDj3WKfRma7FryZGaaXGiulskVmte-mTQ5P5475R-v_4cLOOC94D39Njh9VM6UDA8DQAapDTRPBWYMsAUVZIYiTRjNgMnQ5Dzq6Q89ANgEdSCvj5g9SSBZ2HQpgASG1vp7sEbyu2R3Hbrs-oR7QrhhseXnngqqmeFiEX0QlSeMNJoDDYalS_BOVqEKYMPt4d4phgnbO3hIMKzAywSAv-2ueOiPw-94pwluBe6gI8PxjBEH9AdCJkFwGkSgD-AMHiEncEgIeQO4DtxoBSIRzpEyYEAcSh_JLAQegrsH0gxr4Q6CwiTnAecSRsAG9cARwBgQGMBSfFyxRkihuAPD9DvRhivJx5y20ugheiCWGH1HGrm2NVTbQimr8UuLbt17MuZY52AnlyL1gbJW21FGXuuUZuvsEqbm5tgChSk08o-FNn5L_T9gfwrvBRgNY7bBDwq0YOBYL8rzL6QPzimWAftrGLKcVSGMVQBH2EBl7cKHtYPB5C19dNr5z2uAVQAGLp4EHwG3i6H7RBw576y3u1B28Qk1HLJ1jGITrFGNCNgBFoGBIh3iPJBEQBq83Oao2gunsiLHxOABs5KhpUmaR4kYn-5w8AhBhx8IfYCpuCrhiDueLe7gReYkYQcPJgM2HPgDrljJGhSQDzkNRJdOqzwhEQWPALuC53nBUiSlNSEauD_CSJ4CpFDiAJqQEyAJhZqoURCcnfvl933gOHLJpqYY17i0uvi5xGkxLldfKE5T8mZZF9dhxuLNFMjPZFqN1azU7-pN0FJOt2DE5yUeOY536lQBAx4PRRAg4c1AxoktJJsNdtCAVxhQIUzNF6tEnLBGgoY36pdO2T82NtBmaFUHygSPT17x8UJewggl3isbNR1xuD3quNWOPiHmYJPO_Abv_0LQ_ijuQF5cg1EqHAHI6NDZQvDJmEEL8zrPp0JSHjA8ktdMpxgv0MPCJwZPHuTJIFJ42XVGaVliOiKOZ4s4QEUImAG7Lh0awiAL8Wc0A7GHcEUgXkUyKShLqktJS1dJuFmMplcQVWOFH6WUQTRNFESNYFqEHkPAEOHnEaE3fJgGDIwN4X0gPDyVFDreqa1N1i65TNnWuobVeVpmN4c1ujbFZUkUiKi5dZ06RFqnkGxOYaUpp1hMmeZqj4THu4QeQozH5jypfacAGqDycZ9V4Sfg0Nn3wSZFxIOQkhLC_mP769UWGox-VoEvISn7AzEhU7S8fYCeVYCppBQe9j45Rwq7bHcl7_oU-FNwHdxIJWutJ2goxn1R6WAAH4yKeREF6KKyQhvwjXD3w2vHfcCxRUBPXnWdKDMc6FLQ0xhtUAixz46OkOP5OleEKFREniLYVThPYKjhZ5HKizyQnzoRpDKSY8QRJACzQsOwGTuIupUyDBEDI2JxcxwQF1JlIkJThCMJ7I0UeuCxJDDL-4A5lnVJNlVaOrzwPs3NT7M3lPq_gaa1Ob8UE3KILZrZLMbUujhKNTrfwcbcl-oa67oEG5d8xBzvlu6wyqAzoGfmPSqvC2YuQlX9YF-b1NLvSYEWkAqkkIPzemfsdHAsRJ9FIw3oCRn3I7CFN_TQo_pD6qTvYu5lO8qu7_Z3kXZ9hXrCsBU6NOmQYTgNGKBu0Y4p-GC4aeygMCHgGHjRkgY8cG4BEISHgquDcpeIEFvNsbmg-DGhNoFw-Yg8ni3ygEdCyDfcwNsBsysIBlARUmsxYhXADgT9k2IGig8JWnBWRJjIhBlCoAERaxxEoAh0IZWvfiBi5Ul4ItAFjSihPoXfB8zRbG6rXbsh8nssYdZSi5lompfJ21h8C3Z185LNvPpWm6XYT7SOvUoHK_Psiw_zZPqPF5qPmOPdBsoaFSkSo6LOEY7qSEW1IDQlacWiVWYOqlQ8nKdRhKjEazMn1Bnp0LRyWdC6loHNLDqyg3iLr2ENHBHmXieLLzvKu_53MU_JdNBh44sgYri6rCZEQDfxzkyoOdhNoyNCMjw3VqEIf4hJIQnWuVAwJPg13CHtJsK2EZQTDwGjLyrchg_8EW88Y6ZDEAxBGHixfx_YeuFniGagcRAaCqflm1koV2HIAXKg6RxQL9j9CEAAn-VJGDhLBPNSRooNEddbBvnKRPYPK71CYHbcY8KNYJwL9pHwRnbJUojmHzLYyWUqdp5zx3LO5tWvpobV01Sjn0twbQprm1r_70CzXUxzqTq_zrNZbEpm9lMyPpk6t2QeC3D8phf4kCNl6ZCLFlkN-Bwv-7y1Ra4LRH8AJNhwGMKI2FkRnFsO7UUoKmRFxE_wbBZ5OxhUlEMNJKZfUeIRKzQBRRWKMH9iEZm5z7Nidn0d2NE-guUpg2WjVuKWw8Ag4TKBNDipkCLQEWhd9BmuIv8bsAAENPzUNHiU12nfeLFlj1BKSjckaBF4Uw6pOEatRcU49RF9BB3PF3Qk2FbYXvS3PHRBKzYEqSAknCKyFoJSDH0x9n_lNwEOKGnwfGQjg8xCMiFuBBho4PQRkbki7lbkSoVOQ4T7FoFCBL8hsn28D0xHsa34eW3FpSn2CuQ1pZRXm80aQ3CphBxSzKajDbNPFrbayZdUYnZ1NqGWUM0yrTmUxaQj0_FucYdTbDzkgkG7XrJSgpIObRTqQqPCFoU8BKIQ6AkG22fxCKgAsJGFVfIquwRDlXiYXZWfKHI5wMwmnXTE3gc9st9Rybvc__-Uog6EcaAdnJLAGO1fQoSHCniFPIZBADKtROX3AlhELyouggsHJQWRDw80iIIRZ8NmIygYwkMPPI9AxvAJ2iPseMaqjlHCDZGrS8SSGO1rQJoKEBjCaGOLIeFFEeJLGolTURE4PUQ60jLKmCFCZ8R1LxKTltENYZS8Q4TiInY4jzKrilpb8u8D7JjMmlyObqme2lKrX1xdpm4Xp2ab825KNlJYunFJuazrGnytecmUcysUWpxjKyXZOZV6hB3vWNShElfqYFPvdconoyIUtPVG7jCeslnnpRaG_WADi0B2ATyMUq1iPoKnwCIh6JKic3cocatVWTWtv0_Rkcou0I6y25F7QkFHUoE8NulEblr2y70ZB4lGkXp2oNV1Wl-DZ0dNGqHl4Uixh3BEJCiH8hWik0yDTO6aVUNOmcM87Ef3yh-CHB2yGQ5ueoJEpMLNYEexJSkMmAiRRwuSDZHQA6xDGWlBhbcEOcIITEoR8k_S9IbUhMpgWT9w_4gC_CDAVqpjh7m_RP3EUwVoER9keVSqoy9_xiWrLNTvgx29G3PJyRcUaM2DH1xxtriwZzTy7Os8zTSbuJa11tlT9XYJse-BqIZ1jX6fNqyuvu8qV0O-pTItdUlLLmmq0_pIyOO3vsIHrO4IarfpdEZIp3bFEA9GFacAJSJbGGxvhQ5AbaxhBCE1UWExSFXO2xmv84oiyQPSZiJoFvkeeCGBMDEqlsbdm6_Dpp3p_6MnpDp4k28GLZSVzwjpG_Hu8oMm7jDMJ-cB31RU4nv1lRQRTqQbGfEBvNMD_yXURUX7cJD-zGkJDgrRITL0JkXSEX08SzEpfB8DPCEFm4ZG33lLeSQIEYQJ7hWIJqcBEBA0ioicpaFzIwyyjQoYJb4KIz7cJgOCRy8ThKJFpxGR2dFHWeJ78Y-aCd3mVGJ4FOjRF5acnHdc3MMSjxK8Kd675FMHGz56V_IymZxrrbG54joIMZHsmnKeaZ3mNvs5r1OsafGzt32VrdQXFDe1x8qF_pte4APOTWpVGjAIQRHbEJXUQ9kpGDGRU1zlxYSok5EFb8ujjmoQ3wvzWiAqskUFFRPjte3iF4NykVRaqqAlrPa-D6_0xWxHzuxc3OWnhB4I60CSTtLhHPgaTVFRK-JLeMBpOosou7OLRhBCrkEKs4C-AiI0GksElXi9qE6TyUd0oJT8Mo_TShJ3ZD6esbNFbPKlHbeDgFWoLkW8qiAW7CiwROThknzF4MMqv0pbOkigEQZfaBlxKQIu-FFS0xwGbyxEqsBAQkkrtCTjT7T4t6_weCRfy8OGO7c0z62Pnqljn2XqdmCNc5gKraVmu06O1rzHIh1h5DqnqYWSakzLPvBlMc2HKa2tlD763PSWnC1H5HGfyCNr5AANoj-0VFA_MOUO1wUyNkEloD_WIqxR0BjCqjQfwplivc6nIbwiSVEh6SA2guc5hCZFbZGR3BTfiLsHehTaWTK7bq37v-FPkbYDkIANO74EC_sMTa1VjWOUwUZXZS3wFSAn6Swb8KakQ9oD6eydIjYwggbCEZGhzKosZMhUCvqL2Zsj5_H_4w7-bv43r19d1OXLell_uNoQwy0sOK9339H_9JOXL7-5apdXL19etaleXZ91lHL98uVn7er764vXL1-2N8N19_PZ67uJcfrZzWXdj9_9h-S2Jfn0i7P5-63QwW_4A_u0z57TK_jLi2__LwAA__9s2i9A44AA"
};

var DappGit = {
  icon:"http://orig07.deviantart.net/a7d7/f/2012/151/5/2/meme_me_encanta_png_by_agustifran-d51rxv9.png",
  git: "git@github.com:LiskHQ/cryptipad.git"
};

// Account info for delegate to register manually
var Daccount = {
  "address": "9946841100442405851C",
  "publicKey": "caf0f4c00cf9240771975e42b6672c88a832f98f01825dda6e001e2aab0bc0cc",
  "password": "1234",
  "secondPassword" : "12345",
  "balance": 0,
  "delegateName":"sebastian",
  "username":"bdevelle"
};

// Existing delegate account in blockchain
var Eaccount = {
  "address": "17604940945017291637C",
  "publicKey": "f143730cbb5c42a9a02f183f8ee7b4b2ade158cb179b12777714edf27b4fcf3e",
  "password": "GwRr0RlSi",
  "balance": 0,
  "delegateName": "genesisDelegate100"
};

// List of all transaction types codes
var TxTypes = {
  SEND : 0,
  SIGNATURE : 1,
  DELEGATE : 2,
  VOTE : 3,
  USERNAME : 4,
  FOLLOW : 5,
  MESSAGE : 6,
  AVATAR : 7,
  MULTI: 8,
  DAPP: 9
};

var DappType = {
  DAPP : 0,
  FILE: 1
};

var DappCategory = {
  "Common": 0,
  "Business": 1,
  "Catalogs": 2,
  "Education": 3,
  "Entertainment": 4,
  "Multimedia": 5,
  "Networking": 6,
  "Utilities": 7,
  "Games": 8
};

// Account info for foundation account - LISK > 1,000,000 | Needed for voting, registrations and Tx
var Faccount = {
  "address": "2334212999465599568C",
  "publicKey": "631b91fa537f74e23addccd30555fbc7729ea267c7e0517cbf1bfcc46354abc3",
  "password": "F3DP835EBuZMAhiuYn2AzhJh1lz8glLolghCMD4X8lRh5v2GlcBWws7plIDUuPjf3GUTOnyYEfXQx7cH",
  "balance": 0
};

// Random LISK Amount
var LISK = Math.floor(Math.random() * (100000 * 100000000)) + 1; // Remove 1 x 0 for reduced fees (delegate + Tx)

// Used to create random delegates names
function randomDelegateName() {
  var size = randomNumber(1,20); // Min. delegate name size is 1, Max. delegate name is 20
  var delegateName = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&_.";

  for( var i=0; i < size; i++ )
    delegateName += possible.charAt(Math.floor(Math.random() * possible.length));

  return delegateName;
}

// Randomize a property from within an object
function randomProperty(obj, needKey) {
  var keys = Object.keys(obj)

  if (!needKey) {
    return obj[keys[keys.length * Math.random() << 0]];
  } else {
    return keys[keys.length * Math.random() << 0];
  }
};

// Randomizes LISK amount
function randomLISK() {
  return Math.floor(Math.random() * (10000 * 100000000)) + (1000 * 100000000);
}

// Returns current block height
function getHeight(cb) {
  request({
    type: "GET",
    url: baseUrl + "/api/blocks/getHeight",
    json: true
  }, function (err, resp, body) {
    if (err || resp.statusCode != 200) {
      return cb(err || "Status code is not 200 (getHeight)");
    } else {
      return cb(null, body.height);
    }
  })
}

function onNewBlock(cb) {
  getHeight(function(err, height) {
    console.log("Height: " + height);
    if (err) {
      return cb(err);
    } else {
      waitForNewBlock(height, cb);
    }
  });
}

// Function used to wait until a new block has been created
function waitForNewBlock(height, cb) {
  var actualHeight = height;
  async.doWhilst(
    function (cb) {
      request({
        type: "GET",
        url: baseUrl + "/api/blocks/getHeight",
        json: true
      }, function (err, resp, body) {
        if (err || resp.statusCode != 200) {
          return cb(err || "Got incorrect status");
        }

        if (height + 2 == body.height) {
          height = body.height;
        }

        setTimeout(cb, 1000);
      });
    },
    function () {
      return actualHeight == height;
    },
    function (err) {
      if (err) {
        return setImmediate(cb, err);
      } else {
        return setImmediate(cb, null, height);
      }
    }
  )
}

// Adds peers to local node
function addPeers(numOfPeers, cb) {
  var operatingSystems = ["win32","win64","ubuntu","debian", "centos"];
  var ports = [4000, 5000, 7000, 8000];
  var sharePortOptions = [0,1];
  var os,version,port,sharePort;

  var i = 0;
  async.whilst(function () {
    return i < numOfPeers
  }, function (next) {
    os = operatingSystems[randomizeSelection(operatingSystems.length)];
    version = config.version;
    port = ports[randomizeSelection(ports.length)];
    // sharePort = sharePortOptions[randomizeSelection(sharePortOptions.length)];

    request({
      type: "GET",
      url: baseUrl + "/peer/height",
      json: true,
      headers: {
        "version": version,
        "port": port,
        "share-port": 0,
        "os": os
      }
    }, function (err, resp, body) {
      if (err || resp.statusCode != 200) {
        return next(err || "Status code is not 200 (getHeight)");
      } else {
        i++;
        next();
      }
    })
  }, function (err) {
    return cb(err);
  });
}

// Used to randomize selecting from within an array. Requires array length
function randomizeSelection(length) {
  return Math.floor(Math.random() * length);
}

// Returns a random number between min (inclusive) and max (exclusive)
function randomNumber(min, max) {
  return  Math.floor(Math.random() * (max - min) + min);
}

// Calculates the expected fee from a transaction
function expectedFee(amount) {
  return parseInt(amount * Fees.transactionFee);
}

// Used to create random usernames
function randomUsername() {
  var size = randomNumber(1,16); // Min. username size is 1, Max. username size is 16
  var username = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&_.";

  for( var i=0; i < size; i++ )
    username += possible.charAt(Math.floor(Math.random() * possible.length));

  return username;
}

function randomCapitalUsername() {
  var size = randomNumber(1,16); // Min. username size is 1, Max. username size is 16
  var username = "A";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&_.";

  for( var i=0; i < size-1; i++ )
    username += possible.charAt(Math.floor(Math.random() * possible.length));

  return username;
}

// Used to create random basic accounts
function randomAccount() {
  var account = {
    "address" : "",
    "publicKey" : "",
    "password" : "",
    "secondPassword": "",
    "delegateName" : "",
    "username":"",
    "balance": 0
  };

  account.password = randomPassword();
  account.secondPassword = randomPassword();
  account.delegateName = randomDelegateName();
  account.username =  randomUsername();

  return account;
}

// Used to create random transaction accounts (holds additional info to regular account)
function randomTxAccount() {
  return _.defaults(randomAccount(), {
    sentAmount:"",
    paidFee: "",
    totalPaidFee: "",
    transactions: []
  })
}

// Used to create random passwords
function randomPassword() {
  return Math.random().toString(36).substring(7);
}

// Exports variables and functions for access from other files
module.exports = {
  api: api,
  chai: chai,
  peer : peer,
  lisk : require("./lisk-js"),
  supertest: supertest,
  expect: expect,
  version: version,
  LISK: LISK,
  Faccount: Faccount,
  Daccount: Daccount,
  Eaccount: Eaccount,
  TxTypes: TxTypes,
  DappType: DappType,
  DappCategory: DappCategory,
  DappAscii: DappAscii,
  DappGit: DappGit,
  Fees: Fees,
  normalizer: normalizer,
  blockTime: blockTime,
  blockTimePlus: blockTimePlus,
  randomProperty: randomProperty,
  randomDelegateName: randomDelegateName,
  randomLISK: randomLISK,
  randomPassword: randomPassword,
  randomAccount: randomAccount,
  randomTxAccount: randomTxAccount,
  randomUsername: randomUsername,
  randomNumber: randomNumber,
  randomCapitalUsername: randomCapitalUsername,
  expectedFee:expectedFee,
  addPeers:addPeers,
  peers_config: config.mocha.peers,
  config: config,
  waitForNewBlock: waitForNewBlock,
  getHeight: getHeight,
  onNewBlock: onNewBlock
};
