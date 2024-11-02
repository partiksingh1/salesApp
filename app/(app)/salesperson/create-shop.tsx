import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';


const CreateShopkeeperForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    contactNumber: '',
    email: '',
    gpsLocation: '',
    preferredDeliverySlot: '',
  });
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };
  const fetchLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to proceed.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFormData({
        ...formData,
        gpsLocation: `${location.coords.latitude}, ${location.coords.longitude}`,
      });
      Alert.alert('Success', 'Location captured successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleImageSelection = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission to access media library is required!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);
    }
  };

  const handleTakePicture = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission to access camera is required!');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);
    }
  };

  const handleSubmit = async () => {
    const { name, ownerName, contactNumber, email } = formData;
    if (!name || !ownerName || !contactNumber || !email) {
      Alert.alert('Error', 'Please fill out all required fields.');
      return;
    }

    setLoading(true);
    try {
      await fetchLocation();
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) {
        Alert.alert('Error', 'User not found');
        setLoading(false);
        return;
      }

      const user = JSON.parse(userStr);
      const formDataToSend = new FormData();
      (Object.keys(formData) as Array<keyof typeof formData>).forEach((key) => {
        formDataToSend.append(key, formData[key]);
      });
      formDataToSend.append('salespersonId', user.id.toString());

      // Handle image if exists
      if (image) {
        const imageFileName = image.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(imageFileName);
        const imageType = match ? `image/${match[1]}` : 'image/jpeg';
        formDataToSend.append('image', {
          uri: image,
          name: imageFileName,
          type: imageType,
        } as any);
      }

      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_API_URL}/salesperson/create-shop`,
        formDataToSend,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.status === 201) {
        Alert.alert('Success', 'Shopkeeper created successfully!');
        router.replace('/salesperson/dashboard');
      }
    } catch (error: any) {
      console.error('Error creating shopkeeper:', error.response?.data || error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create shopkeeper');
    } finally {
      setLoading(false);
    }
  };

  const handleClearImage = () => {
    setImage(null);
  };

  

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(app)/salesperson/dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Onboard Shop</Text>
      </View>

      <ScrollView style={styles.formContainer}>
        {Object.entries(formData).map(([key, value]) => (
          <View style={styles.inputCard} key={key}>
            <Text style={styles.label}>
              *{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder={`Enter ${key}`}
              value={value}
              onChangeText={(text) => handleInputChange(key, text)}
              keyboardType={key === 'contactNumber' ? 'phone-pad' : key === 'email' ? 'email-address' : 'default'}
            />
          </View>  
        ))}
        

        <TouchableOpacity onPress={handleImageSelection} style={styles.imagePicker}>
          {image ? (
            <Image source={{ uri: image }} style={styles.imagePreview} />
          ) : (
            <Text style={styles.imagePlaceholder}>Select Shopkeeper Image</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleTakePicture} style={styles.button}>
          <Ionicons name="camera" size={24} color="white" />
          <Text style={styles.buttonText}>Take Picture</Text>
        </TouchableOpacity>

        {image && (
          <TouchableOpacity onPress={handleClearImage} style={styles.clearButton}>
            <Ionicons name="close" size={24} color="white" />
            <Text style={styles.clearButtonText}>Clear Image</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={fetchLocation} style={styles.button}>
        <Text style={styles.buttonText}>Get GPS Location</Text>
      </TouchableOpacity>
        <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Create Shopkeeper</Text>
          )}
        </TouchableOpacity>
      </ScrollView> 
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    flex: 1,
  },
  formContainer: {
    marginBottom: 20,
  },
  inputCard: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: '#333',
  },
  textArea: {
    backgroundColor: 'white',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
      padding: 12,
      marginBottom: 1,
      height: 60,
      textAlignVertical: 'top',
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  imagePlaceholder: {
    color: '#A9A9A9',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
    flexDirection: 'row',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    marginLeft: 10,
  },
  clearButton: {
    backgroundColor: '#FF0000',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
    flexDirection: 'row',
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 16,
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: '#28A745',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateShopkeeperForm;