


const pool= require('../config/db');

//fetch available doctors
const fetchAvailableDoctors = async ()=>{
    
        const result = await pool.query (
            "SELECT id , name ,specialization FROM users WHERE role = 'Doctor' AND is_available=true "
        );
        return result.rows;
        
    }

module.exports = {fetchAvailableDoctors};