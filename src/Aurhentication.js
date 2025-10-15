import React, { useEffect, useState } from 'react'
import axios from 'axios'


function Authentic(){
    const [auth, setAuth] = useState(false);
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    
    //.....
    axios.defaults.withCredentials = true; 
    //.......
    
    useEffect(() =>{
        axios.get("http://localhost:8081")
        .then(res=>{
            // console.log(res.data.Status)
            if(res.data.Status === "Success"){
                setAuth(true);
                setName(res.data.name);
            }else{
                //console.log("S");
                setAuth(false);
                setMessage(res.data.Message);
            }
        })
    }, [])

    return(auth)
}

export default Authentic;