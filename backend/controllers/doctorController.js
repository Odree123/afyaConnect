
const { fetchAvailableDoctors } = require('../models/doctorModel');
//get available doctors
const getAvailableDoctors = async (req, res)=>{
    try{
        const  doctors = await fetchAvailableDoctors();
        res.json(doctors);
    }
    catch(err){
        console.error(err.message);
        res.status(500).json("Error fetching available doctors");
    }
};

module.exports = {getAvailableDoctors};