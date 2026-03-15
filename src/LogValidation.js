function LogValidation(values){
    let error = {}
    const email_pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if(values.email === "") {
        error.email = "Email shouldn't be empty"
    }
    else if(!email_pattern.test(values.email)) {
        error.email = "Email Didn't match"
    }else {
        error.email = ""
    }
    if(values.password === "") {
        // console.log("P");
        error.password = "Password shouldn't be empty"
    } else {
        error.password = ""
    }
    return error;
}

export default LogValidation;
