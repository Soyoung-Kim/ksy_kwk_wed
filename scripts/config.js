export const APP_CONFIG = {
  supabaseUrl: 'https://kagzenniuseexohgoggv.supabase.co',
  supabasePublishableKey: 'sb_publishable_dTkmvxrDFeRSPp5keks-ag_bU15zkY3',

  weddingIso: '2026-11-08T11:30:00+09:00',
  coupleLabel: '소영 ❤ 우경',

  venue: {
    name: '농심웨딩컨벤션',
    address: '서울 동작구 여의대방로 112',
    lat: 37.4965688,
    lng: 126.9187584
  },

    guestbook: {
    table: 'guestbook_entries',
    functions: {
      create: 'guestbook-create',
      update: 'guestbook-update',
      delete: 'guestbook-delete',
      aiSuggest: 'guestbook-ai'
    },
    brideName: '소영',
    groomName: '우경'
  }
};
