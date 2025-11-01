"""
Tests for the High School Management System API
"""
from fastapi.testclient import TestClient
from src.app import app

client = TestClient(app)


def test_root_redirect():
    """Test that root endpoint redirects to static/index.html"""
    response = client.get("/", follow_redirects=False)  # Don't follow the redirect
    assert response.status_code == 307  # Temporary redirect
    assert response.headers["location"] == "/static/index.html"


def test_get_activities():
    """Test retrieving all activities"""
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    
    # Check some expected activities exist
    assert "Chess Club" in data
    assert "Programming Class" in data
    
    # Verify activity structure
    for activity_name, details in data.items():
        assert isinstance(details, dict)
        assert "description" in details
        assert "schedule" in details
        assert "max_participants" in details
        assert "participants" in details
        assert isinstance(details["participants"], list)


def test_signup_success():
    """Test successful activity signup"""
    activity_name = "Chess Club"
    test_email = "newstudent@mergington.edu"
    
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": test_email}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert test_email in data["message"]
    assert activity_name in data["message"]
    
    # Verify participant was actually added
    activities_response = client.get("/activities")
    assert test_email in activities_response.json()[activity_name]["participants"]


def test_signup_duplicate():
    """Test signing up an already registered student"""
    activity_name = "Programming Class"
    existing_email = "emma@mergington.edu"  # Already in the activity
    
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": existing_email}
    )
    
    assert response.status_code == 400
    assert "already signed up" in response.json()["detail"]


def test_signup_nonexistent_activity():
    """Test signing up for a non-existent activity"""
    response = client.post(
        "/activities/NonexistentClub/signup",
        params={"email": "test@mergington.edu"}
    )
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_unregister_success():
    """Test successful unregistration from activity"""
    activity_name = "Chess Club"
    test_email = "daniel@mergington.edu"  # Existing participant
    
    response = client.delete(
        f"/activities/{activity_name}/signup",
        params={"email": test_email}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert test_email in data["message"]
    assert activity_name in data["message"]
    
    # Verify participant was actually removed
    activities_response = client.get("/activities")
    assert test_email not in activities_response.json()[activity_name]["participants"]


def test_unregister_not_registered():
    """Test unregistering a student who isn't signed up"""
    activity_name = "Chess Club"
    test_email = "notregistered@mergington.edu"
    
    response = client.delete(
        f"/activities/{activity_name}/signup",
        params={"email": test_email}
    )
    
    assert response.status_code == 404
    assert "not signed up" in response.json()["detail"]


def test_unregister_nonexistent_activity():
    """Test unregistering from a non-existent activity"""
    response = client.delete(
        "/activities/NonexistentClub/signup",
        params={"email": "test@mergington.edu"}
    )
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()