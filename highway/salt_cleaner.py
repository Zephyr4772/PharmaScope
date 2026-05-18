import re

def get_clean_salt(salt_string):
    """
    Normalizes salt names to be used as a universal join key.
    E.g. 'Metformin Hydrochloride 500mg IP' -> 'metformin'
    """
    if not salt_string or not isinstance(salt_string, str):
        return ""
        
    salt = salt_string.lower()
    
    # Remove common dosage forms and weights (basic implementation)
    salt = re.sub(r'\b\d+(mg|g|mcg|ml)\b', '', salt)
    salt = salt.replace('hydrochloride', 'hcl')
    salt = salt.replace(' ip', '').replace(' bp', '').replace(' usp', '')
    
    return salt.strip()
