import React from 'react';
import { Platform } from 'react-native';

// Dynamic import for DateTimePicker (native module, not available on web)
let DateTimePickerComponent: any = null;

if (Platform.OS !== 'web') {
  try {
    // Use dynamic import to avoid bundler issues on web
    DateTimePickerComponent = require('@react-native-community/datetimepicker').default;
  } catch (e) {
    console.warn('DateTimePicker not available:', e);
  }
}

interface DateTimePickerWrapperProps {
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
  onChange: (event: any, selectedDate?: Date) => void;
}

export const DateTimePickerWrapper: React.FC<DateTimePickerWrapperProps> = (props) => {
  if (Platform.OS === 'web' || !DateTimePickerComponent) {
    return null; // Don't render on web
  }

  const DateTimePicker = DateTimePickerComponent;
  return <DateTimePicker {...props} />;
};
