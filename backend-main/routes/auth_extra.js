router.get('/admin-id', async (req, res) => {
    try {
        const admin = await User.findOne({ role: 'admin' });
        if (admin) res.json({ adminId: admin._id });
        else res.status(404).json({ error: "No admin found" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
