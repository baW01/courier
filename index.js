const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const cors = require('cors');


const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

async function getDistanceFromStart(startCoords, deliveryCoords) {
    const apiKey = 'AIzaSyATopaTCsisTvx-uPTyUFx0e95YwZb-XiY'; // Upewnij się, że jest poprawny i aktywny
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${startCoords}&destinations=${deliveryCoords}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        console.log(response.data); // Logujemy całą odpowiedź, aby zobaczyć jej strukturę.

        // Sprawdzenie statusu odpowiedzi
        if (response.data.status !== 'OK') {
            console.error('Error with the distance matrix response:', response.data.status);
            return null;
        }

        const element = response.data.rows[0].elements[0];
        if (element.status !== 'OK') {
            console.error('Error with the distance matrix element:', element.status);
            return null;
        }

        const distance = element.distance.value; // Teraz powinniśmy mieć pewność, że ta właściwość istnieje
        return distance;
    } catch (error) {
        console.error('Error fetching distance from Google Maps API:', error);
        return null;
    }
}


async function sortDeliveriesByDistance(deliveries, startCoords) {
    const deliveryDistances = await Promise.all(deliveries.map(async (delivery) => {
        const distance = await getDistanceFromStart(startCoords, `${delivery.latitude},${delivery.longitude}`);
        return { ...delivery, distance };
    }));

    // Sortowanie dostaw według odległości
    const sortedDeliveries = deliveryDistances.sort((a, b) => a.distance - b.distance);
    return sortedDeliveries;
}

app.post('/calculate-route', async (req, res) => {
    const startCoords = '53.9281091,15.1930816'; // Zastąp odpowiednimi wartościami
    const sortedDeliveries = await sortDeliveriesByDistance(deliveries, startCoords);
    console.log(sortedDeliveries);
    res.json(sortedDeliveries);
});


let deliveries = []; // Przechowuje informacje o dostawach

app.post('/deliveries', (req, res) => {
    const { address } = req.body;
    if (!address) {
        return res.status(400).send('Adres jest wymagany.');
    }
    const newDelivery = { address, delivered: false };
    deliveries.push(newDelivery);
    res.status(201).send(newDelivery);
});

app.patch('/deliveries/:index', (req, res) => {
    const { index } = req.params;
    if (index < 0 || index >= deliveries.length) {
        return res.status(404).send('Dostawa nie znaleziona.');
    }
    deliveries[index].delivered = true;
    res.send(deliveries[index]);
});

app.get('/deliveries', (req, res) => {
    res.send(deliveries);
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
  });
  
  
