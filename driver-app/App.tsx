import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { RoleHeader } from './src/components/RoleHeader';
import { HomeScreen } from './src/screens/HomeScreen';

function App(): JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <RoleHeader role="司机端" />
      <HomeScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});

export default App;


