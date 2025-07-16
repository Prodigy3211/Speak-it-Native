import * as Haptics from 'expo-haptics';

export const haptics = {
    //light feedback for subtle interactions
    light: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    //medium feedback for more noticeable interactions
    medium: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    },

    //Success feedback for completed actions
    success: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    //Select Feedback for picking options
    select: () => {
        Haptics.selectionAsync();
    }
};

//Specicic haptic functions for common interactions

export const hapticFeedback ={
    //voting interactions
    vote: () => haptics.light(),

    //Submit actions(comments, claims)
    submit: () => haptics.success(),

    //Share Actions
    share: () => haptics.medium(),

    //navigation
    navigate: () => haptics.light(),

    //Selection (categories, options)
    select: () => haptics.select(),

    //Image Upload
    upload: () => haptics.medium(),

    //Modal interactions
    modal: () => haptics.light(),

    //Long Press
    longPress: () => haptics.medium(),

}