// pages/settings/settings.js
const app = getApp();
const i18n = require("../../utils/i18n.js");

Page({
  data: {
    t: {},
    theme: "light",
    darkMode: false,
    language: "vi",
    pushNotif: true
  },

  onShow() {
    const theme = i18n.getTheme();
    const language = i18n.getLanguage();
    
    let pushNotif = true;
    try {
      const val = tt.getStorageSync("settings_notifications");
      if (val !== null && val !== "") pushNotif = JSON.parse(val);
    } catch (e) {}



    const t = i18n.getTranslations();

    this.setData({
      t,
      theme,
      darkMode: theme === "dark",
      language,
      pushNotif
    });

    tt.setNavigationBarTitle({
      title: t.settings.title
    });
  },

  handleLanguageChange() {
    const nextLang = this.data.language === "vi" ? "en" : "vi";
    i18n.setLanguage(nextLang);
    this.setData({
      language: nextLang,
      t: i18n.getTranslations()
    });
    
    // Set navigation bar title dynamically
    tt.setNavigationBarTitle({
      title: i18n.getTranslations().settings.title
    });

    tt.showToast({
      title: nextLang === "en" ? "Language updated!" : "Đã cập nhật ngôn ngữ!",
      icon: "success"
    });
  },

  handleDarkModeToggle(e) {
    const isDark = e.detail.value;
    const nextTheme = isDark ? "dark" : "light";
    i18n.setTheme(nextTheme);
    this.setData({
      theme: nextTheme,
      darkMode: isDark
    });
  },



  handleNotificationsToggle(e) {
    const val = e.detail.value;
    try {
      tt.setStorageSync("settings_notifications", JSON.stringify(val));
    } catch (err) {}
    this.setData({ pushNotif: val });
  },

});
