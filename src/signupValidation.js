function Validation(values){
    let error = {}
    const email_pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
    const password_pattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!])[A-Za-z\d@#$%^&+=!]{8,}$/;

    // const password_pattern =/$/
    
    
    
    
    if(values.name === "") {
        error.name = "Name shouldn't be empty"
    }
    else {
        error.name = ""
    }
    
    if(values.email === "") {
        error.email = "Email shouldn't be empty"
    }
    else if(!email_pattern.test(values.email)) {
        error.email = "Email Didn't match"
    }else {
        error.email = ""
    }
    
    if(values.password === "") {
        error.password = "Password shouldn't be empty"
    }
    else if(!password_pattern.test(values.password)) {

        error.password = "Password didn't match"
        alert("Use stronger Password " )
    } else {
        error.password = ""
    }
    console.log(error)
    return error;
}

export default Validation; 